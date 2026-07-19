"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Network } from "vis-network/standalone";
import styles from "./hub-detail.module.css";

// Color palette for biotypes
const BIOTYPE_COLORS = {
  protein_coding: "#4CAF50",
  lncRNA: "#FF9800",
  pseudogene: "#9E9E9E",
  processed_pseudogene: "#BDBDBD",
  unprocessed_pseudogene: "#BDBDBD",
  other: "#607D8B",
};

export default function HubGenes() {
  const [hubGenes, setHubGenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const networkRef = useRef(null);
  const containerRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/hub-genes")
      .then((res) => (res.ok ? res.json() : Promise.reject("Failed to fetch")))
      .then((data) => setHubGenes(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Render network once data is ready
  useEffect(() => {
    if (!hubGenes.length || !containerRef.current) return;

    // Prepare nodes
    const nodes = hubGenes.map((g) => {
      const biotype = g.gene_biotype || "other";
      const color = BIOTYPE_COLORS[biotype] || "#607D8B";
      return {
        id: g.gene_id,
        label: g.gene_symbol || g.gene_id,
        size: 10 + (g.score / 100) * 40, // 10-50
        color: color,
        title: `${g.gene_symbol || g.gene_id}\nScore: ${g.score}\n${g.description || ""}`,
        gene: g, // store original data
      };
    });

    // Build edges: connect genes that share the same biotype
    const edges = [];
    const groups = {};
    hubGenes.forEach((g) => {
      const biotype = g.gene_biotype || "other";
      if (!groups[biotype]) groups[biotype] = [];
      groups[biotype].push(g.gene_id);
    });
    // For each group, connect all pairs (dense cluster) – limit to 50 edges per group to avoid clutter
    Object.values(groups).forEach((group) => {
      if (group.length < 2) return;
      // Connect each node to the first one (star) to keep it clean
      const first = group[0];
      for (let i = 1; i < Math.min(group.length, 10); i++) {
        edges.push({
          from: first,
          to: group[i],
          color: "#d3d3d3",
          width: 1,
        });
      }
    });

    // If no edges, add a few random connections based on score
    if (edges.length === 0) {
      const sorted = [...hubGenes].sort((a, b) => b.score - a.score);
      for (let i = 0; i < Math.min(sorted.length - 1, 20); i++) {
        edges.push({
          from: sorted[i].gene_id,
          to: sorted[i + 1].gene_id,
          color: "#d3d3d3",
          width: 1,
        });
      }
    }

    const data = { nodes, edges };
    const options = {
      nodes: {
        shape: "dot",
        scaling: {
          min: 10,
          max: 50,
          label: {
            enabled: false, // show labels only on hover
          },
        },
        font: {
          size: 12,
          color: "#333",
        },
        borderWidth: 1,
      },
      edges: {
        smooth: {
          type: "curvedCW",
          roundness: 0.2,
        },
      },
      physics: {
        enabled: true,
        solver: "forceAtlas2Based",
        forceAtlas2Based: {
          gravitationalConstant: -50,
          centralGravity: 0.01,
          springLength: 200,
          springConstant: 0.08,
        },
        maxVelocity: 50,
        minVelocity: 0.1,
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        zoomView: true,
        dragView: true,
      },
      layout: {
        improvedLayout: true,
      },
    };

    // Instantiate network
    const network = new Network(containerRef.current, data, options);
    networkRef.current = network;

    // Click event: navigate to hub detail
    network.on("click", (params) => {
      if (params.nodes.length > 0) {
        const geneId = params.nodes[0];
        router.push(`/hubs/${encodeURIComponent(geneId)}`);
      }
    });

    // Cleanup
    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [hubGenes, router]);

  const goHome = () => router.push("/");

  if (loading)
    return <div className={styles.loadingContainer}>Loading hub genes…</div>;
  if (error) return <div className={styles.errorMessage}>Error: {error}</div>;

  return (
    <div className={styles.appContainer}>
      <nav className={styles.topNav}>
        <button className={styles.homeBtn} onClick={goHome}>
          <i className="fas fa-home"></i> Home
        </button>
        <span className={styles.navTitle}>Hub Gene Network</span>
      </nav>

      <div className={styles.heroSection}>
        <h2>Hub Gene Network</h2>
        <p>
          Nodes represent hub genes, sized by hubness score. Colours show
          biotype.
        </p>
      </div>

      <div className={styles.contentContainer}>
        <div className={styles.legend}>
          {Object.entries(BIOTYPE_COLORS).map(([biotype, color]) => (
            <span key={biotype} className={styles.legendItem}>
              <span
                className={styles.legendDot}
                style={{ backgroundColor: color }}
              ></span>
              {biotype}
            </span>
          ))}
        </div>
        <div ref={containerRef} className={styles.networkContainer} />
      </div>
    </div>
  );
}
