"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import styles from "./hubs.module.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const PAGE_SIZE = 50;

export default function HubGenes() {
  const [hubGenes, setHubGenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [biotypeFilter, setBiotypeFilter] = useState("all");
  const [navigatingTo, setNavigatingTo] = useState(null);
  const [page, setPage] = useState(1);
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

  // Reset to page 1 whenever the filtered set changes shape
  useEffect(() => {
    setPage(1);
  }, [searchTerm, biotypeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredGenes.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pageGenes = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredGenes.slice(start, start + PAGE_SIZE);
  }, [filteredGenes, currentPage]);

  const goToGene = (geneId) => {
    if (navigatingTo) return;
    setNavigatingTo(geneId);
    router.push(`/gene/${geneId}`);
  };

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));

  // Compact page-number list: current +/- 2, plus first/last with ellipses
  const pageNumbers = useMemo(() => {
    const nums = new Set([1, totalPages, currentPage]);
    for (let d = 1; d <= 2; d++) {
      if (currentPage - d >= 1) nums.add(currentPage - d);
      if (currentPage + d <= totalPages) nums.add(currentPage + d);
    }
    return Array.from(nums).sort((a, b) => a - b);
  }, [currentPage, totalPages]);

  if (error) {
    return (
      <div className={styles.appContainer}>
        <div className={styles.errorMessage}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={styles.appContainer}>
      <SiteHeader pageTitle="Hub Genes Explorer" />

      <div className={styles.heroSection}>
        <p>
          Explore potential hub genes associated with <em>Coffea arabica</em>{" "}
          somatic embryogenesis.
        </p>
      </div>

      <div className={styles.contentContainer}>
        {/* -- Filter bar -- */}
        <div className={styles.filterBar}>
          <div
            className={styles.searchWrapper}
            style={{ margin: 0, flex: "1 1 220px" }}
          >
            <input
              type="text"
              placeholder="Search by gene ID..."
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
            Showing{" "}
            {filteredGenes.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}
            -{Math.min(currentPage * PAGE_SIZE, filteredGenes.length)} of{" "}
            {filteredGenes.length} hub genes
          </div>
        )}

        {/* -- Loading state: skeleton chip grid -- */}
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
            <div className={styles.chipGrid}>
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <div
                  key={i}
                  className={styles.geneChip}
                  style={{ opacity: 0.5 }}
                >
                  <span className={styles.chipSkeleton} />
                </div>
              ))}
            </div>
          </>
        )}

        {/* -- Compact chip grid of gene IDs -- */}
        {!loading && (
          <>
            <div className={`${styles.chipGrid} ${styles.fadeIn}`}>
              {pageGenes.map((g) => {
                const isLoading = navigatingTo === g.gene_id;
                const isDisabled = navigatingTo && navigatingTo !== g.gene_id;

                return (
                  <button
                    key={g.gene_id}
                    className={`${styles.geneChip} ${
                      isLoading ? styles.geneChipLoading : ""
                    } ${isDisabled ? styles.geneChipDisabled : ""}`}
                    onClick={() => goToGene(g.gene_id)}
                    disabled={isDisabled}
                    aria-busy={isLoading}
                    title={`View ${g.gene_id}`}
                  >
                    {isLoading ? (
                      <i
                        className={`fas fa-circle-notch ${styles.geneChipSpinner}`}
                        aria-hidden="true"
                      ></i>
                    ) : (
                      <i
                        className="fas fa-diagram-project"
                        aria-hidden="true"
                      ></i>
                    )}
                    <span className={styles.geneChipId}>{g.gene_id}</span>
                  </button>
                );
              })}

              {filteredGenes.length === 0 && (
                <div className={styles.noResults}>
                  No hub genes match your filters.
                </div>
              )}
            </div>

            {/* -- Pagination -- */}
            {filteredGenes.length > PAGE_SIZE && (
              <div className={styles.pagination}>
                <button
                  className={styles.pageNavBtn}
                  onClick={goPrev}
                  disabled={currentPage === 1}
                >
                  <i className="fas fa-chevron-left"></i>
                </button>

                {pageNumbers.map((n, idx) => {
                  const prev = pageNumbers[idx - 1];
                  const showEllipsis = prev !== undefined && n - prev > 1;
                  return (
                    <React.Fragment key={n}>
                      {showEllipsis && (
                        <span className={styles.pageEllipsis}>...</span>
                      )}
                      <button
                        className={`${styles.pageNumBtn} ${
                          n === currentPage ? styles.pageNumActive : ""
                        }`}
                        onClick={() => setPage(n)}
                      >
                        {n}
                      </button>
                    </React.Fragment>
                  );
                })}

                <button
                  className={styles.pageNavBtn}
                  onClick={goNext}
                  disabled={currentPage === totalPages}
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
