// =============================================================================
// lib/grn-data.js
//
// Direct port of the Shiny app's server-side logic (Section 3 of the R file)
// onto grn_nodes / grn_edges in MySQL instead of the two flat files.
//
// Matches the Shiny app exactly — same three view modes, mutually exclusive,
// same as `view_mode` in the R server:
//   "full"   -> every node/edge (default on load)
//   "gene"   -> exact NodeID match (case-insensitive) -> that gene's 1-hop
//               subnetwork, or a not-found flag if nothing matches
//   "family" -> every edge belonging to one TF family, plus every node in
//               that family even if it has no matching edge
//
// There is no module filter, methods-count filter, or edge cap in the Shiny
// app, so none exist here either — the sidebar is only "find a gene" and
// "browse by TF family," same as the R UI.
//
// Sizing is unchanged: node size / edge width are BASE + PER-UNIT*value,
// capped (not min-max rescaled), anchored to the FULL network so scale never
// jumps when a filter narrows the view.
// =============================================================================

import { getPool } from "./db";

const NODE_SIZE_BASE_PX = 10;
const NODE_SIZE_PER_DEGREE_PX = 2;
const NODE_SIZE_CAP_PX = 55;

const EDGE_WIDTH_BASE_PX = 1;
const EDGE_WIDTH_CAP_PX = 10;

// NodeCategory (DB/Shiny) -> display_group (frontend/legend). This network is
// TF -> Hub only, so there is no "Target Gene" category here — only these three.
function toDisplayGroup(nodeCategory) {
  switch (nodeCategory) {
    case "TF only":
      return "TF";
    case "Hub Gene only":
      return "Hub Gene";
    case "TF & Hub Gene":
      return "TF + Hub";
    default:
      return nodeCategory || "Unknown";
  }
}

function nodeSizePx(degreeTotal) {
  return Math.min(
    NODE_SIZE_BASE_PX + degreeTotal * NODE_SIZE_PER_DEGREE_PX,
    NODE_SIZE_CAP_PX,
  );
}

function edgeWidthPx(weight, edgeWidthPerWeightUnit) {
  return Math.min(
    EDGE_WIDTH_BASE_PX + weight * edgeWidthPerWeightUnit,
    EDGE_WIDTH_CAP_PX,
  );
}

// --- Full-network stats, cached in-process ----------------------------------
// Mirrors the Shiny script's one-time `.edge_max_weight` / `family_sizes`
// computation done at load. Cached for META_TTL_MS so repeated requests
// don't re-scan the full edge table; bump the TTL or wire in revalidation
// if the network gets reloaded while the server is running.
const META_TTL_MS = 5 * 60 * 1000;
let metaCache = null;
let metaCacheAt = 0;

async function getFullNetworkMeta() {
  const now = Date.now();
  if (metaCache && now - metaCacheAt < META_TTL_MS) return metaCache;

  const pool = getPool();

  const [[edgeAgg]] = await pool.query(
    `SELECT COUNT(*) AS totalEdges,
            COALESCE(MAX(mean_weight_norm), 0) AS maxWeight
     FROM grn_edges`,
  );

  const [[nodeAgg]] = await pool.query(
    `SELECT COUNT(*) AS totalNodes,
            SUM(node_category IN ('Hub Gene only', 'TF & Hub Gene')) AS hubTotal
     FROM grn_nodes`,
  );

  // Same as Shiny's `family_sizes <- edges_raw %>% count(TF_Family) %>%
  // arrange(desc(n_edges))` — drives the ordering of the clickable list.
  const [families] = await pool.query(
    `SELECT tf_family AS family, COUNT(*) AS n_edges
     FROM grn_edges
     WHERE tf_family IS NOT NULL
     GROUP BY tf_family
     ORDER BY n_edges DESC`,
  );

  const maxWeight = Number(edgeAgg.maxWeight) || 0;
  const edgeWidthPerWeightUnit =
    maxWeight > 0 ? (EDGE_WIDTH_CAP_PX - EDGE_WIDTH_BASE_PX) / maxWeight : 0;

  metaCache = {
    totalEdges: edgeAgg.totalEdges,
    totalNodes: nodeAgg.totalNodes,
    hubTotal: nodeAgg.hubTotal,
    edgeWidthPerWeightUnit,
    tfFamilies: families.map((f) => ({ family: f.family, n_edges: f.n_edges })),
  };
  metaCacheAt = now;
  return metaCache;
}

function toNodeRow(n, degreeView) {
  return {
    id: n.node_id,
    NodeType: n.node_type,
    NodeCategory: n.node_category,
    TF_Family: n.tf_family,
    ModuleColor: n.module_color,
    degree_full: n.degree_total,
    degree_view: degreeView,
    is_hub: n.node_category !== "TF only",
    display_group: toDisplayGroup(n.node_category),
    node_size_px: nodeSizePx(n.degree_total),
  };
}

function toEdgeRow(e, edgeWidthPerWeightUnit) {
  return {
    Source: e.source_id,
    Target: e.target_id,
    Interaction: e.interaction,
    TF_Family: e.tf_family,
    Module: e.module,
    Methods_Count: e.methods_count,
    Edge_Weight: e.mean_weight_norm,
    edge_width_px: edgeWidthPx(e.mean_weight_norm, edgeWidthPerWeightUnit),
  };
}

function baseMeta(meta) {
  return {
    totalNodes: meta.totalNodes,
    totalEdges: meta.totalEdges,
    hubTotal: meta.hubTotal,
    tfFamilies: meta.tfFamilies,
  };
}

// --- Main query --------------------------------------------------------------
// mode: "full" | "gene" | "family" (mutually exclusive, like the Shiny
// `view_mode` reactiveVal). `search` is only read in "gene" mode, `family`
// only in "family" mode.
export async function getFilteredNetwork({
  mode = "full",
  search = "",
  family = "",
} = {}) {
  const pool = getPool();
  const meta = await getFullNetworkMeta();

  // --- "gene" mode: exact NodeID match (case-insensitive), same as the
  //     Shiny app's `toupper(nodes_raw$NodeID) == toupper(gid)` lookup.
  if (mode === "gene") {
    const gid = search.trim();
    if (!gid) {
      return {
        nodes: [],
        edges: [],
        meta: {
          ...baseMeta(meta),
          viewMode: "gene",
          notFound: false,
          searchedGene: null,
        },
      };
    }

    const [rows] = await pool.query(
      `SELECT * FROM grn_nodes WHERE UPPER(node_id) = UPPER(?) LIMIT 1`,
      [gid],
    );

    if (rows.length === 0) {
      // Mirror Shiny's "not found" message instead of silently blanking the view.
      return {
        nodes: [],
        edges: [],
        meta: {
          ...baseMeta(meta),
          viewMode: "gene",
          notFound: true,
          searchedGene: gid,
        },
      };
    }

    const matched = rows[0];
    const [edgeRows] = await pool.query(
      `SELECT source_id, target_id, interaction, tf_family, module,
              methods_count, mean_weight_norm
       FROM grn_edges
       WHERE source_id = ? OR target_id = ?`,
      [matched.node_id, matched.node_id],
    );

    const degreeView = new Map();
    edgeRows.forEach((e) => {
      degreeView.set(e.source_id, (degreeView.get(e.source_id) || 0) + 1);
      degreeView.set(e.target_id, (degreeView.get(e.target_id) || 0) + 1);
    });

    // Keep the gene visible even if isolated — Shiny's
    // `unique(c(e$Source, e$Target, g))`.
    const nodeIds = new Set([matched.node_id]);
    edgeRows.forEach((e) => {
      nodeIds.add(e.source_id);
      nodeIds.add(e.target_id);
    });
    const idList = [...nodeIds];
    const [nodeRows] = await pool.query(
      `SELECT * FROM grn_nodes WHERE node_id IN (${idList.map(() => "?").join(",")})`,
      idList,
    );

    return {
      nodes: nodeRows.map((n) => toNodeRow(n, degreeView.get(n.node_id) || 0)),
      edges: edgeRows.map((e) => toEdgeRow(e, meta.edgeWidthPerWeightUnit)),
      meta: {
        ...baseMeta(meta),
        viewMode: "gene",
        notFound: false,
        searchedGene: matched.node_id,
        searchedNodeInfo: {
          category: matched.node_category,
          degree_full: matched.degree_total,
        },
      },
    };
  }

  // --- "family" mode: every edge in the family, plus every node in the
  //     family even without a matching edge — Shiny's
  //     `unique(c(e$Source, e$Target, nodes_raw$NodeID[nodes_raw$TF_Family == fam]))`.
  if (mode === "family") {
    const fam = family.trim();
    if (!fam) {
      return {
        nodes: [],
        edges: [],
        meta: { ...baseMeta(meta), viewMode: "family", selectedFamily: null },
      };
    }

    const [edgeRows] = await pool.query(
      `SELECT source_id, target_id, interaction, tf_family, module,
              methods_count, mean_weight_norm
       FROM grn_edges
       WHERE tf_family = ?`,
      [fam],
    );

    const [familyMemberRows] = await pool.query(
      `SELECT node_id FROM grn_nodes WHERE tf_family = ?`,
      [fam],
    );

    const nodeIds = new Set(familyMemberRows.map((r) => r.node_id));
    edgeRows.forEach((e) => {
      nodeIds.add(e.source_id);
      nodeIds.add(e.target_id);
    });

    const degreeView = new Map();
    edgeRows.forEach((e) => {
      degreeView.set(e.source_id, (degreeView.get(e.source_id) || 0) + 1);
      degreeView.set(e.target_id, (degreeView.get(e.target_id) || 0) + 1);
    });

    let nodeRows = [];
    if (nodeIds.size > 0) {
      const idList = [...nodeIds];
      const [rows] = await pool.query(
        `SELECT * FROM grn_nodes WHERE node_id IN (${idList.map(() => "?").join(",")})`,
        idList,
      );
      nodeRows = rows;
    }

    return {
      nodes: nodeRows.map((n) => toNodeRow(n, degreeView.get(n.node_id) || 0)),
      edges: edgeRows.map((e) => toEdgeRow(e, meta.edgeWidthPerWeightUnit)),
      meta: { ...baseMeta(meta), viewMode: "family", selectedFamily: fam },
    };
  }

  // --- "full" mode (default on load): every node, every edge -----------------
  const [edgeRows] = await pool.query(
    `SELECT source_id, target_id, interaction, tf_family, module,
            methods_count, mean_weight_norm
     FROM grn_edges`,
  );
  const [nodeRows] = await pool.query(`SELECT * FROM grn_nodes`);

  const degreeView = new Map();
  edgeRows.forEach((e) => {
    degreeView.set(e.source_id, (degreeView.get(e.source_id) || 0) + 1);
    degreeView.set(e.target_id, (degreeView.get(e.target_id) || 0) + 1);
  });

  return {
    nodes: nodeRows.map((n) => toNodeRow(n, degreeView.get(n.node_id) || 0)),
    edges: edgeRows.map((e) => toEdgeRow(e, meta.edgeWidthPerWeightUnit)),
    meta: { ...baseMeta(meta), viewMode: "full" },
  };
}
