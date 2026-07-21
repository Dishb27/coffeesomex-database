"use client";

import React, {
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import * as d3 from "d3";
import styles from "./network.module.css";
import SiteHeader from "@/components/SiteHeader";

const COLORS = {
  gold: "#9c7526",
  copper: "#a1552b",
  merlot: "#7c3541",
  ink: "#2c2415",
  inkDim: "#8a7c65",
  edgeLine: "rgba(44, 36, 21, 0.16)",
  paper: "#fbf8f1",
};

const GROUP_COLOR = {
  TF: COLORS.copper,
  "Hub Gene": COLORS.gold,
  "TF + Hub": COLORS.merlot,
};

const DEBOUNCE_MS = 300;
const PAGE_SIZE = 20;

export default function GRNExplorer() {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const simRef = useRef(null);
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  const draggingRef = useRef(null);
  const panRef = useRef(null);

  const [tab, setTab] = useState("network");
  const [hoverNode, setHoverNode] = useState(null);
  const [dims, setDims] = useState({ w: 900, h: 640 });

  const [viewMode, setViewMode] = useState("full");
  const [searchInput, setSearchInput] = useState("");
  const [committedGene, setCommittedGene] = useState("");
  const [selectedFamily, setSelectedFamily] = useState(null);

  const [data, setData] = useState({ nodes: [], edges: [], meta: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination state
  const [edgePage, setEdgePage] = useState(1);
  const [nodePage, setNodePage] = useState(1);

  // Reset pages when data changes
  useEffect(() => {
    setEdgePage(1);
    setNodePage(1);
  }, [data]);

  const showFullNetwork = () => {
    setViewMode("full");
    setSearchInput("");
    setCommittedGene("");
    setSelectedFamily(null);
  };

  const runGeneSearch = () => {
    if (!searchInput.trim()) return;
    setSelectedFamily(null);
    setViewMode("gene");
    setCommittedGene(searchInput.trim());
  };

  const clickFamily = (fam) => {
    setSearchInput("");
    setCommittedGene("");
    setSelectedFamily(fam);
    setViewMode("family");
  };

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("mode", viewMode);
    if (viewMode === "gene") params.set("search", committedGene);
    if (viewMode === "family") params.set("family", selectedFamily || "");
    return params.toString();
  }, [viewMode, committedGene, selectedFamily]);

  // ---- Fetch data ----
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/grn?${queryString}`);
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const json = await res.json();
        if (cancelled) return;
        setData(json);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load network");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [queryString]);

  const nodes = data.nodes || [];
  const edges = data.edges || [];
  const meta = data.meta || {};
  const tfFamilies = meta.tfFamilies || [];
  const isolatedCount = nodes.filter((n) => n.degree_view === 0).length;

  // Paginated data
  const paginatedEdges = useMemo(() => {
    const start = (edgePage - 1) * PAGE_SIZE;
    return edges.slice(start, start + PAGE_SIZE);
  }, [edges, edgePage]);

  const paginatedNodes = useMemo(() => {
    const start = (nodePage - 1) * PAGE_SIZE;
    return nodes.slice(start, start + PAGE_SIZE);
  }, [nodes, nodePage]);

  const totalEdgePages = Math.ceil(edges.length / PAGE_SIZE);
  const totalNodePages = Math.ceil(nodes.length / PAGE_SIZE);

  const viewModeLabel =
    viewMode === "gene"
      ? `Subnetwork for gene: ${meta.searchedGene || committedGene}`
      : viewMode === "family"
        ? `Subnetwork for TF family: ${selectedFamily}`
        : "Full TF → Hub consensus network";

  // ---- Resize observer ----
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDims({ w: Math.max(300, width), h: Math.max(300, height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- Draw function ----
  const draw = useCallback(() => {
    if (tab !== "network") return;

    const canvas = canvasRef.current;
    const s = simRef.current;
    if (!canvas || !s) return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dims.w * dpr;
    canvas.height = dims.h * dpr;
    canvas.style.width = dims.w + "px";
    canvas.style.height = dims.h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, dims.w, dims.h);

    const t = transformRef.current;
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.scale(t.k, t.k);

    ctx.lineCap = "round";
    s.links.forEach((l) => {
      const sx = l.source.x,
        sy = l.source.y,
        tx = l.target.x,
        ty = l.target.y;
      if (sx == null || tx == null) return;
      ctx.strokeStyle = COLORS.edgeLine;
      ctx.lineWidth = l.edge_width_px / t.k;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
    });

    s.nodes.forEach((n) => {
      if (n.x == null) return;
      const r = n.node_size_px;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = GROUP_COLOR[n.display_group] || COLORS.inkDim;
      ctx.globalAlpha = hoverNode && hoverNode.id !== n.id ? 0.35 : 1;
      ctx.fill();
      if (n.display_group === "TF + Hub") {
        ctx.lineWidth = 2.5 / t.k;
        ctx.strokeStyle = "rgba(44,36,21,0.8)";
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (hoverNode && hoverNode.id === n.id) {
        ctx.lineWidth = 2 / t.k;
        ctx.strokeStyle = COLORS.ink;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    ctx.restore();
  }, [dims, hoverNode, tab]);

  // ---- Force simulation ----
  useEffect(() => {
    if (nodes.length === 0) {
      if (simRef.current) {
        simRef.current.sim.stop();
        simRef.current = null;
      }
      return;
    }

    if (simRef.current) {
      simRef.current.sim.stop();
      simRef.current = null;
    }

    const nodeCopy = nodes.map((n) => ({ ...n }));
    const idIndex = new Map(nodeCopy.map((n, i) => [n.id, i]));
    const linkCopy = edges
      .filter((e) => idIndex.has(e.Source) && idIndex.has(e.Target))
      .map((e) => ({ ...e, source: e.Source, target: e.Target }));

    const sim = d3
      .forceSimulation(nodeCopy)
      .force(
        "link",
        d3
          .forceLink(linkCopy)
          .id((d) => d.id)
          .distance(46)
          .strength(0.35),
      )
      .force("charge", d3.forceManyBody().strength(-70))
      .force("center", d3.forceCenter(dims.w / 2, dims.h / 2))
      .force(
        "collide",
        d3.forceCollide((d) => d.node_size_px + 3),
      )
      .alpha(1)
      .alphaDecay(0.02);

    simRef.current = { sim, nodes: nodeCopy, links: linkCopy };
    sim.on("tick", draw);
    draw();

    return () => {
      sim.stop();
      simRef.current = null;
    };
  }, [nodes, edges, dims]);

  // ---- Redraw when switching to network tab ----
  useEffect(() => {
    if (tab === "network") {
      draw();
    }
  }, [tab, draw]);

  // ---- Zoom & Fit functions ----
  const zoomIn = () => {
    const t = transformRef.current;
    const k = Math.min(4, t.k * 1.3);
    const cx = dims.w / 2;
    const cy = dims.h / 2;
    const wx = (cx - t.x) / t.k;
    const wy = (cy - t.y) / t.k;
    transformRef.current = { k, x: cx - wx * k, y: cy - wy * k };
    draw();
  };

  const zoomOut = () => {
    const t = transformRef.current;
    const k = Math.max(0.25, t.k / 1.3);
    const cx = dims.w / 2;
    const cy = dims.h / 2;
    const wx = (cx - t.x) / t.k;
    const wy = (cy - t.y) / t.k;
    transformRef.current = { k, x: cx - wx * k, y: cy - wy * k };
    draw();
  };

  const fitNetwork = () => {
    const s = simRef.current;
    if (!s || s.nodes.length === 0) return;

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const n of s.nodes) {
      if (n.x == null) continue;
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    }
    if (minX === Infinity) return;

    const padding = 40;
    const w = dims.w - padding * 2;
    const h = dims.h - padding * 2;
    const width = maxX - minX || 1;
    const height = maxY - minY || 1;
    const scaleX = w / width;
    const scaleY = h / height;
    const k = Math.min(4, Math.max(0.25, Math.min(scaleX, scaleY)));

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const tx = dims.w / 2 - cx * k;
    const ty = dims.h / 2 - cy * k;

    transformRef.current = { k, x: tx, y: ty };
    draw();
  };

  // ---- Interactions ----
  const toWorld = (px, py) => {
    const t = transformRef.current;
    return { x: (px - t.x) / t.k, y: (py - t.y) / t.k };
  };

  const findNodeAt = (wx, wy) => {
    const s = simRef.current;
    if (!s) return null;
    let hit = null;
    for (const n of s.nodes) {
      if (n.x == null) continue;
      const dx = n.x - wx,
        dy = n.y - wy;
      if (dx * dx + dy * dy <= (n.node_size_px + 3) * (n.node_size_px + 3))
        hit = n;
    }
    return hit;
  };

  const onPointerDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left,
      py = e.clientY - rect.top;
    const { x: wx, y: wy } = toWorld(px, py);
    const hit = findNodeAt(wx, wy);
    if (hit) {
      draggingRef.current = hit;
      hit.fx = hit.x;
      hit.fy = hit.y;
      simRef.current.sim.alphaTarget(0.3).restart();
    } else {
      panRef.current = {
        startX: px,
        startY: py,
        ox: transformRef.current.x,
        oy: transformRef.current.y,
      };
    }
  };

  const onPointerMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left,
      py = e.clientY - rect.top;
    if (draggingRef.current) {
      const { x: wx, y: wy } = toWorld(px, py);
      draggingRef.current.fx = wx;
      draggingRef.current.fy = wy;
      return;
    }
    if (panRef.current) {
      const dx = px - panRef.current.startX,
        dy = py - panRef.current.startY;
      transformRef.current = {
        ...transformRef.current,
        x: panRef.current.ox + dx,
        y: panRef.current.oy + dy,
      };
      draw();
      return;
    }
    const { x: wx, y: wy } = toWorld(px, py);
    const hit = findNodeAt(wx, wy);
    setHoverNode(hit ? { ...hit, px, py } : null);
  };

  const onPointerUp = () => {
    if (draggingRef.current) {
      draggingRef.current.fx = null;
      draggingRef.current.fy = null;
      simRef.current.sim.alphaTarget(0);
    }
    draggingRef.current = null;
    panRef.current = null;
  };

  const onWheel = (e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left,
      py = e.clientY - rect.top;
    const t = transformRef.current;
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const k = Math.min(4, Math.max(0.25, t.k * factor));
    const wx = (px - t.x) / t.k,
      wy = (py - t.y) / t.k;
    transformRef.current = { k, x: px - wx * k, y: py - wy * k };
    draw();
  };

  // ---- Render ----
  return (
    <div className={styles.root}>
      <SiteHeader pageTitle="TF → Hub Gene Consensus Network Explorer" />
      <div className={styles.header}>
        <div className={styles.eyebrow}>Coffea arabica · consensus network</div>
        {/* <div className={styles.title}>
          TF → Hub Gene <span className={styles.accent}>Consensus Network</span>{" "}
          Explorer
        </div> */}
      </div>

      {error && (
        <div className={styles.errorBanner}>
          Couldn't load the network: {error}. Retrying will happen automatically
          on the next filter change.
        </div>
      )}

      <div className={styles.body}>
        <div className={styles.sidebar}>
          <div className={styles.field}>
            <label className={styles.label}>Find a gene</label>
            <input
              className={styles.input}
              placeholder="e.g. LOC113688074"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runGeneSearch()}
            />
            <div className={styles.searchRow}>
              <button
                className={`${styles.btn} ${styles.primary}`}
                onClick={runGeneSearch}
              >
                Search
              </button>
              <button className={styles.btn} onClick={showFullNetwork}>
                Show full network
              </button>
            </div>
            {viewMode === "gene" && meta.searchedGene && !meta.notFound && (
              <div className={`${styles.searchStatus} ${styles.found}`}>
                Found: {meta.searchedGene}
                {meta.searchedNodeInfo &&
                  ` (${meta.searchedNodeInfo.category}, degree ${meta.searchedNodeInfo.degree_full})`}
              </div>
            )}
            {viewMode === "gene" && meta.notFound && (
              <div className={`${styles.searchStatus} ${styles.notFound}`}>
                Gene ID "{meta.searchedGene}" was not found in the network.
              </div>
            )}
          </div>

          <hr className={styles.hr} />

          <div className={styles.field}>
            <label className={styles.label}>Browse by TF family</label>
            <div className={styles.familyList}>
              {loading ? (
                <div className={styles.familyLoader}>
                  <span className={styles.loadingSpinnerSmall} />
                  <span>Loading families…</span>
                </div>
              ) : tfFamilies.length === 0 ? (
                <div className={styles.noFamilies}>No TF families found</div>
              ) : (
                tfFamilies.map(({ family, n_edges }) => (
                  <button
                    key={family}
                    className={`${styles.familyLink} ${selectedFamily === family ? styles.active : ""}`}
                    onClick={() => clickFamily(family)}
                  >
                    <span>{family}</span>
                    <span className={styles.count}>({n_edges})</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className={styles.main}>
          <div className={styles.viewLabel}>{viewModeLabel}</div>
          <div className={styles.summary}>
            <span>
              Nodes shown: {nodes.length} / {meta.totalNodes ?? "…"}
            </span>
            <span>
              Edges shown: {edges.length} / {meta.totalEdges ?? "…"}
            </span>
            <span>Isolated in view: {isolatedCount}</span>
          </div>

          <div className={styles.tabs}>
            {[
              ["network", "Network"],
              ["edges", "Edges table"],
              ["nodes", "Nodes table"],
            ].map(([key, label]) => (
              <button
                key={key}
                className={`${styles.tab} ${tab === key ? styles.active : ""}`}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {!loading && nodes.length === 0 && !error ? (
            <div className={styles.emptyState}>
              <div className={styles.title}>
                {meta.notFound ? "Gene not found" : "Nothing to show"}
              </div>
              <div>
                {meta.notFound
                  ? "Try a different gene ID, or show the full network."
                  : "This family has no matching nodes or edges."}
              </div>
            </div>
          ) : (
            <>
              {/* Network Canvas */}
              <div
                className={styles.canvasWrap}
                ref={wrapRef}
                style={{ display: tab === "network" ? "block" : "none" }}
              >
                <canvas
                  ref={canvasRef}
                  className={styles.canvas}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerLeave={onPointerUp}
                  onWheel={onWheel}
                />
                <div className={styles.canvasControls}>
                  <button
                    className={styles.zoomBtn}
                    onClick={zoomIn}
                    title="Zoom in"
                  >
                    +
                  </button>
                  <button
                    className={styles.zoomBtn}
                    onClick={zoomOut}
                    title="Zoom out"
                  >
                    −
                  </button>
                  <button
                    className={styles.zoomBtn}
                    onClick={fitNetwork}
                    title="Fit network"
                  >
                    ⊡
                  </button>
                </div>
                {hoverNode && (
                  <div
                    className={styles.tooltip}
                    style={{
                      left: hoverNode.px + 14,
                      top: hoverNode.py + 14,
                    }}
                  >
                    <div>
                      <b>{hoverNode.id}</b>
                    </div>
                    <div className={styles.ttRow}>
                      <span>Type</span>
                      <span>{hoverNode.NodeCategory}</span>
                    </div>
                    {hoverNode.TF_Family && (
                      <div className={styles.ttRow}>
                        <span>TF family</span>
                        <span>{hoverNode.TF_Family}</span>
                      </div>
                    )}
                    {/* <div className={styles.ttRow}>
                      <span>Degree (this view)</span>
                      <span>{hoverNode.degree_view}</span>
                    </div>
                    <div className={styles.ttRow}>
                      <span>Degree (full network)</span>
                      <span>{hoverNode.degree_full}</span>
                    </div>
                    <div className={styles.ttRow}>
                      <span>Module</span>
                      <span>{hoverNode.ModuleColor}</span>
                    </div> */}
                  </div>
                )}
                <div className={styles.legend}>
                  {Object.entries(GROUP_COLOR).map(([g, c]) => (
                    <div className={styles.legendItem} key={g}>
                      <span
                        className={styles.legendDot}
                        style={{ background: c }}
                      />
                      {g}
                    </div>
                  ))}
                </div>
                {loading && (
                  <div className={styles.loadingOverlay}>
                    <div className={styles.spinner} />
                    <div className={styles.loadingMsg}>Loading network…</div>
                  </div>
                )}
              </div>

              {/* Edges Table with Pagination */}
              {tab === "edges" && (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Source</th>
                        <th>Target</th>
                        <th>Interaction</th>
                        <th>TF family</th>
                        <th>Module</th>
                        <th>Methods count</th>
                        <th>Mean weight (norm)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedEdges.map((e, i) => (
                        <tr key={i}>
                          <td>{e.Source}</td>
                          <td>{e.Target}</td>
                          <td>{e.Interaction}</td>
                          <td>{e.TF_Family}</td>
                          <td>{e.Module}</td>
                          <td>{e.Methods_Count}</td>
                          <td>{Number(e.Edge_Weight).toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {totalEdgePages > 1 && (
                    <div className={styles.pagination}>
                      <button
                        className={styles.pageBtn}
                        onClick={() => setEdgePage((p) => Math.max(1, p - 1))}
                        disabled={edgePage === 1}
                      >
                        Previous
                      </button>
                      <span className={styles.pageInfo}>
                        Page {edgePage} of {totalEdgePages}
                      </span>
                      <button
                        className={styles.pageBtn}
                        onClick={() =>
                          setEdgePage((p) => Math.min(totalEdgePages, p + 1))
                        }
                        disabled={edgePage === totalEdgePages}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Nodes Table with Pagination */}
              {tab === "nodes" && (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Node ID</th>
                        <th>Node type</th>
                        <th>Category</th>
                        <th>TF family</th>
                        <th>Module color</th>
                        <th>Degree (view)</th>
                        <th>Degree (full)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedNodes.map((n) => (
                        <tr key={n.id}>
                          <td>{n.id}</td>
                          <td>{n.NodeType}</td>
                          <td>
                            <span
                              className={`${styles.badge} ${
                                n.display_group === "TF"
                                  ? styles.tf
                                  : n.display_group === "Hub Gene"
                                    ? styles.hub
                                    : styles.tfhub
                              }`}
                            >
                              {n.display_group}
                            </span>
                          </td>
                          <td>{n.TF_Family}</td>
                          <td>{n.ModuleColor}</td>
                          <td>{n.degree_view}</td>
                          <td>{n.degree_full}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {totalNodePages > 1 && (
                    <div className={styles.pagination}>
                      <button
                        className={styles.pageBtn}
                        onClick={() => setNodePage((p) => Math.max(1, p - 1))}
                        disabled={nodePage === 1}
                      >
                        Previous
                      </button>
                      <span className={styles.pageInfo}>
                        Page {nodePage} of {totalNodePages}
                      </span>
                      <button
                        className={styles.pageBtn}
                        onClick={() =>
                          setNodePage((p) => Math.min(totalNodePages, p + 1))
                        }
                        disabled={nodePage === totalNodePages}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
