"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { VolcanoPlot } from "@/components/VolcanoPlot";

export default function ComparisionsPage() {
  const router = useRouter();
  const [comparisions, setComparisions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [search, setSearch] = useState("");

  // Detail-view controls
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [regFilter, setRegFilter] = useState("all");
  const [sortKey, setSortKey] = useState("abslog2fc");
  const [sortDir, setSortDir] = useState("desc");
  const [geneSearch, setGeneSearch] = useState("");
  const [geneSearchInput, setGeneSearchInput] = useState("");
  const debounceRef = useRef(null);

  // Volcano plot state
  const [showVolcano, setShowVolcano] = useState(false);
  const [volcanoData, setVolcanoData] = useState(null);
  const [loadingVolcano, setLoadingVolcano] = useState(false);
  const [volcanoError, setVolcanoError] = useState("");

  // Load the left-hand comparison list once
  useEffect(() => {
    fetch("/api/comparisions")
      .then((res) => res.json())
      .then((data) => {
        setComparisions(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // Debounce the gene-id search box
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setGeneSearch(geneSearchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [geneSearchInput]);

  const fetchDetail = useCallback(() => {
    if (!selected) {
      setDetail(null);
      setDetailError("");
      return;
    }
    setLoadingDetail(true);
    setDetailError("");

    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      regulation: regFilter,
      sortKey,
      sortDir,
      search: geneSearch,
    });

    fetch(
      `/api/comparisions/${encodeURIComponent(selected)}?${params.toString()}`,
    )
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok)
          throw new Error(data?.error || "Failed to load comparison");
        return data;
      })
      .then((data) => {
        setDetail(data);
        setLoadingDetail(false);
      })
      .catch((err) => {
        console.error(err);
        setDetailError(err.message || "Something went wrong");
        setDetail(null);
        setLoadingDetail(false);
      });
  }, [selected, page, pageSize, regFilter, sortKey, sortDir, geneSearch]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // Fetch volcano data lazily
  useEffect(() => {
    if (!showVolcano || !selected || volcanoData) return;
    setLoadingVolcano(true);
    setVolcanoError("");

    fetch(`/api/comparisions/${encodeURIComponent(selected)}/volcano`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load plot data");
        return data;
      })
      .then((data) => {
        setVolcanoData(data.points || []);
        setLoadingVolcano(false);
      })
      .catch((err) => {
        console.error(err);
        setVolcanoError(err.message || "Something went wrong");
        setLoadingVolcano(false);
      });
  }, [showVolcano, selected, volcanoData]);

  function selectComparison(comp) {
    setSelected(comp);
    setPage(1);
    setRegFilter("all");
    setGeneSearchInput("");
    setGeneSearch("");
    setSortKey("abslog2fc");
    setSortDir("desc");
    setShowVolcano(false);
    setVolcanoData(null);
    setVolcanoError("");
  }

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "gene_id" ? "asc" : "desc");
    }
    setPage(1);
  }

  function formatPval(v) {
    const n = Number(v);
    if (Number.isNaN(n)) return "—";
    return n < 0.0001 ? n.toExponential(2) : n.toFixed(4);
  }

  const filteredList = comparisions.filter((c) =>
    c.comparison.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const totalPages = detail?.pagination?.totalPages ?? 1;
  const filteredTotal = detail?.pagination?.filteredTotal ?? 0;

  function goToPage(p) {
    const clamped = Math.min(Math.max(1, p), totalPages);
    setPage(clamped);
  }

  function pageNumbers() {
    const nums = new Set([1, totalPages, page, page - 1, page + 1]);
    return [...nums]
      .filter((n) => n >= 1 && n <= totalPages)
      .sort((a, b) => a - b);
  }

  return (
    <>
      {/* Navigation bar using global CSS classes */}
      <nav className="topNav">
        <button className="homeBtn" onClick={() => router.push("/")}>
          <i className="fas fa-home"></i> Home
        </button>
        <span className="navTitle"></span>
      </nav>

      <div className="comparisions-page">
        <div className="comparisions-header">
          <h2>Developmental stage comparisons</h2>
          <p>
            Explore differentially expressed genes across{" "}
            <em>Coffea arabica</em> somatic embryo developmental stages. Select
            a pairwise comparison to view differential expression statistics and
            identify stagespecific uregulated and downregulated genes.
          </p>
        </div>

        {loading ? (
          <div className="comparisions-loading">Loading comparisons…</div>
        ) : (
          <div className="comparisions-grid">
            <div className="comparisions-list">
              <div className="list-header">
                {/* <h2>Comparisons</h2> */}
                <input
                  type="text"
                  className="list-search"
                  placeholder="Search comparisons…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {filteredList.length === 0 ? (
                <div className="list-empty">
                  No comparisons match your search.
                </div>
              ) : (
                <ul>
                  {filteredList.map((comp) => (
                    <li key={comp.comparison}>
                      <button
                        className={`comparision-item ${
                          selected === comp.comparison ? "active" : ""
                        }`}
                        onClick={() => selectComparison(comp.comparison)}
                      >
                        <span className="comp-name">{comp.comparison}</span>
                        <span className="comp-badge">
                          <span className="up">{comp.up_count}↑</span>
                          <span className="down">{comp.down_count}↓</span>
                          <span className="total">{comp.total}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="comparisions-detail">
              {!selected && (
                <div className="detail-placeholder">
                  <p>
                    Select a developmental stage comparison from the left panel
                    to explore the corresponding list of differentially
                    expressed genes.
                  </p>
                </div>
              )}

              {selected && detailError && !loadingDetail && (
                <div className="detail-error">
                  <p>⚠️ {detailError}</p>
                  <button className="retry-btn" onClick={fetchDetail}>
                    Retry
                  </button>
                </div>
              )}

              {selected && detail && !detailError && (
                <div className="detail-content">
                  <div className="detail-header">
                    <h2>{detail.comparision}</h2>
                    <div className="detail-summary">
                      <span>Total: {detail.summary?.total ?? 0}</span>
                      <span className="up">Up: {detail.summary?.up ?? 0}</span>
                      <span className="down">
                        Down: {detail.summary?.down ?? 0}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="volcano-toggle-btn"
                    onClick={() => setShowVolcano((v) => !v)}
                  >
                    {showVolcano ? "Hide" : "Show"} volcano plot
                  </button>

                  {showVolcano && (
                    <>
                      {loadingVolcano && (
                        <div className="detail-loading">Loading plot data…</div>
                      )}
                      {volcanoError && !loadingVolcano && (
                        <div className="detail-error">
                          <p>⚠️ {volcanoError}</p>
                          <button
                            className="retry-btn"
                            onClick={() => {
                              setVolcanoData(null);
                              setVolcanoError("");
                            }}
                          >
                            Retry
                          </button>
                        </div>
                      )}
                      {volcanoData && !loadingVolcano && !volcanoError && (
                        <VolcanoPlot
                          points={volcanoData}
                          comparisonLabel={detail.comparision}
                        />
                      )}
                    </>
                  )}

                  <div className="detail-controls">
                    <div className="filter-pills">
                      {["all", "up", "down"].map((f) => (
                        <button
                          key={f}
                          className={`filter-pill ${regFilter === f ? "active" : ""}`}
                          onClick={() => {
                            setRegFilter(f);
                            setPage(1);
                          }}
                        >
                          {f === "all" ? "All" : f === "up" ? "▲ Up" : "▼ Down"}
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      className="gene-search"
                      placeholder="Search gene ID…"
                      value={geneSearchInput}
                      onChange={(e) => setGeneSearchInput(e.target.value)}
                    />

                    <select
                      className="page-size-select"
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                    >
                      {[25, 50, 100, 200].map((n) => (
                        <option key={n} value={n}>
                          {n} / page
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="detail-table-wrap" aria-busy={loadingDetail}>
                    {loadingDetail && (
                      <div className="table-loading-overlay">Loading…</div>
                    )}
                    <table className="deg-table">
                      <thead>
                        <tr>
                          <th>Gene ID</th>
                          <th>Regulation</th>
                          <th
                            className="sortable"
                            onClick={() => toggleSort("abslog2fc")}
                          >
                            log2FC{" "}
                            {sortKey === "abslog2fc" &&
                              (sortDir === "asc" ? "↑" : "↓")}
                          </th>
                          {/* <th>p-value</th> */}
                          {/* <th
                            className="sortable"
                            onClick={() => toggleSort("padj")}
                          >
                            adj. p{" "}
                            {sortKey === "padj" &&
                              (sortDir === "asc" ? "↑" : "↓")}
                          </th> */}
                          {/* <th>Base Mean</th> */}
                        </tr>
                      </thead>
                      <tbody>
                        {detail.data.map((row) => (
                          <tr key={row.gene_id}>
                            <td className="gene-id">
                              <Link href={`/gene/${row.gene_id}`}>
                                {row.gene_id}
                              </Link>
                            </td>
                            <td>
                              <span
                                className={`regulation-badge ${
                                  row.regulation === "Upregulated"
                                    ? "up"
                                    : "down"
                                }`}
                              >
                                {row.regulation}
                              </span>
                            </td>
                            <td
                              className={
                                Number(row.log2FoldChange) > 0
                                  ? "positive"
                                  : "negative"
                              }
                            >
                              {Number(row.log2FoldChange).toFixed(3)}
                            </td>
                            {/* <td>{formatPval(row.pvalue)}</td> */}
                            {/* <td>{formatPval(row.padj)}</td>
                            <td>{Number(row.baseMean).toFixed(1)}</td> */}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="pagination-bar">
                    <span className="pagination-info">
                      Showing {(page - 1) * pageSize + 1}–
                      {Math.min(page * pageSize, filteredTotal)} of{" "}
                      {filteredTotal.toLocaleString()}
                    </span>

                    <div className="pagination-controls">
                      <button
                        className="page-btn"
                        disabled={page <= 1}
                        onClick={() => goToPage(page - 1)}
                      >
                        ‹ Prev
                      </button>

                      {pageNumbers().map((n, i, arr) => (
                        <span
                          key={n}
                          style={{ display: "flex", alignItems: "center" }}
                        >
                          {i > 0 && arr[i - 1] !== n - 1 && (
                            <span className="page-ellipsis">…</span>
                          )}
                          <button
                            className={`page-btn ${n === page ? "active" : ""}`}
                            onClick={() => goToPage(n)}
                          >
                            {n}
                          </button>
                        </span>
                      ))}

                      <button
                        className="page-btn"
                        disabled={page >= totalPages}
                        onClick={() => goToPage(page + 1)}
                      >
                        Next ›
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
