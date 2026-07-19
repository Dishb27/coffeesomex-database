"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import styles from "./hubs.module.css";

export default function HubGenes() {
  const [hubGenes, setHubGenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [biotypeFilter, setBiotypeFilter] = useState("all");
  const [navigatingTo, setNavigatingTo] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/hub-genes")
      .then((res) => (res.ok ? res.json() : Promise.reject("Failed to fetch")))
      .then((data) => setHubGenes(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const biotypes = useMemo(() => {
    const set = new Set(hubGenes.map((g) => g.gene_biotype).filter(Boolean));
    return Array.from(set).sort();
  }, [hubGenes]);

  const filteredGenes = useMemo(() => {
    return hubGenes.filter((g) => {
      const matchesSearch =
        !searchTerm ||
        g.gene_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.gene_symbol?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBiotype =
        biotypeFilter === "all" || g.gene_biotype === biotypeFilter;
      return matchesSearch && matchesBiotype;
    });
  }, [hubGenes, searchTerm, biotypeFilter]);

  const goHome = () => router.push("/");

  const goToGene = (geneId) => {
    if (navigatingTo) return;
    setNavigatingTo(geneId);
    router.push(`/gene/${geneId}`);
  };

  if (error) {
    return (
      <div className={styles.appContainer}>
        <div className={styles.errorMessage}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={styles.appContainer}>
      <nav className={styles.topNav}>
        <button className={styles.homeBtn} onClick={goHome}>
          <i className="fas fa-home"></i> Home
        </button>
        {/* <span className={styles.navTitle}>Hub Genes Explorer</span> */}
      </nav>

      <div className={styles.heroSection}>
        <h2>Hub Genes Explorer</h2>
        <p>
          Explore potential hub genes associated with <em>Coffea arabica</em>{" "}
          somatic embryogenesis.
        </p>
      </div>

      <div className={styles.contentContainer}>
        {/* ── Filter bar ── */}
        <div className={styles.filterBar}>
          <div
            className={styles.searchWrapper}
            style={{ margin: 0, flex: "1 1 220px" }}
          >
            <input
              type="text"
              placeholder="Search by gene ID…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          {biotypes.length > 0 && (
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Biotype:</span>
              <button
                className={`${styles.filterChip} ${
                  biotypeFilter === "all" ? styles.activeChip : ""
                }`}
                onClick={() => setBiotypeFilter("all")}
              >
                All
              </button>
              {biotypes.map((bt) => (
                <button
                  key={bt}
                  className={`${styles.filterChip} ${
                    biotypeFilter === bt ? styles.activeChip : ""
                  }`}
                  onClick={() => setBiotypeFilter(bt)}
                >
                  {bt}
                </button>
              ))}
            </div>
          )}
        </div>

        {!loading && (
          <div className={styles.resultCount}>
            Showing {filteredGenes.length} of {hubGenes.length} hub genes
          </div>
        )}

        {/* ── Loading state: animated header + skeleton grid ── */}
        {loading && (
          <>
            <div className={styles.hubLoadingHeader}>
              <span className={styles.hubLoadingDna} aria-hidden="true">
                <i className="fas fa-diagram-project"></i>
              </span>
              <p className={styles.hubLoadingText}>
                Gathering hub genes
                <span className={styles.hubLoadingDots}>
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </span>
              </p>
            </div>
            <div className={styles.cardsGrid}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className={styles.geneCard}
                  style={{ opacity: 0.6 }}
                >
                  <div className={styles.geneCardIconWrap}>
                    <i className="fas fa-diagram-project"></i>
                  </div>
                  <div className={styles.skeletonLine} />
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Minimal gene card list ── */}
        {!loading && (
          <div className={`${styles.cardsGrid} ${styles.fadeIn}`}>
            {filteredGenes.map((g, i) => {
              const isLoading = navigatingTo === g.gene_id;
              const isDisabled = navigatingTo && navigatingTo !== g.gene_id;
              const hasDistinctSymbol =
                g.gene_symbol && g.gene_symbol !== g.gene_id;

              return (
                <div
                  key={g.gene_id}
                  className={`${styles.geneCard} ${isLoading ? styles.geneCardLoading : ""} ${
                    isDisabled ? styles.geneCardDisabled : ""
                  }`}
                  style={{ animationDelay: `${Math.min(i * 20, 300)}ms` }}
                  onClick={() => goToGene(g.gene_id)}
                  role="button"
                  tabIndex={isDisabled ? -1 : 0}
                  aria-busy={isLoading}
                >
                  <div className={styles.geneCardIconWrap}>
                    {isLoading ? (
                      <i
                        className={`fas fa-circle-notch ${styles.geneCardSpinner}`}
                      ></i>
                    ) : (
                      <i className="fas fa-diagram-project"></i>
                    )}
                  </div>

                  <h3 className={styles.geneCardId}>
                    {hasDistinctSymbol ? g.gene_symbol : g.gene_id}
                  </h3>

                  {hasDistinctSymbol && (
                    <code className={styles.geneCardSubId}>{g.gene_id}</code>
                  )}

                  {g.gene_biotype && (
                    <span className={styles.biotypeBadge}>
                      {g.gene_biotype}
                    </span>
                  )}
                </div>
              );
            })}

            {filteredGenes.length === 0 && (
              <div className={styles.noResults}>
                No hub genes match your filters.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
