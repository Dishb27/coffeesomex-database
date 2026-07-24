"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import styles from "./family.module.css";
import SiteFooter from "@/components/SiteFooter";

export default function FamilyDetail() {
  const params = useParams();
  const router = useRouter();
  const familyName = decodeURIComponent(params.family);

  const [genes, setGenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    const fetchGenes = async () => {
      setLoading(true);
      try {
        const urlParams = new URLSearchParams({
          family: familyName,
          search: searchTerm,
          page: String(page),
          limit: String(limit),
        });
        const res = await fetch(`/api/tf-genes?${urlParams.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch genes");
        const data = await res.json();
        setGenes(data.genes);
        setTotal(data.total);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchGenes();
  }, [familyName, searchTerm, page]);

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.detailContainer}>
        <div className={styles.header}>
          <button
            className={styles.backBtn}
            onClick={() => router.push("/tfs")}
          >
            ← All Families
          </button>
          <h2>{familyName}</h2>
          <span className={styles.geneCountBadge}>
            {loading ? "…" : `${total} genes`}
          </span>
        </div>

        <div className={styles.searchWrapper}>
          <input
            type="text"
            placeholder="Search genes in this family…"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className={styles.searchInput}
          />
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {!error && loading && (
          <div className={styles.tableWrap}>
            <div className={styles.skeletonLoadingHeader}>
              <span className={styles.skeletonDna} aria-hidden="true">
                <i className="fas fa-dna"></i>
              </span>
              <p className={styles.skeletonLoadingText}>
                Fetching {familyName} genes
                <span className={styles.skeletonDots}>
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </span>
              </p>
            </div>
            <table className={styles.geneTable}>
              <thead>
                <tr>
                  <th>TF ID</th>
                  <th>Gene ID</th>
                  <th>Description</th>
                  <th>Location</th>
                  <th>Biotype</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className={styles.skeletonRow}>
                    <td>
                      <div
                        className={styles.skeletonCell}
                        style={{ width: "70%" }}
                      />
                    </td>
                    <td>
                      <div
                        className={styles.skeletonCell}
                        style={{ width: "80%" }}
                      />
                    </td>
                    <td>
                      <div
                        className={styles.skeletonCell}
                        style={{ width: "95%" }}
                      />
                    </td>
                    <td>
                      <div
                        className={styles.skeletonCell}
                        style={{ width: "60%" }}
                      />
                    </td>
                    <td>
                      <div
                        className={styles.skeletonCell}
                        style={{ width: "50%" }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && (
          <div className={styles.fadeIn}>
            <div className={styles.tableWrap}>
              <table className={styles.geneTable}>
                <thead>
                  <tr>
                    <th>TF ID</th>
                    <th>Gene ID</th>
                    <th>Description</th>
                    <th>Location</th>
                    {/* <th>Biotype</th> */}
                  </tr>
                </thead>
                <tbody>
                  {genes.map((g) => (
                    <tr key={g.tf_id}>
                      <td>
                        <code>{g.tf_id}</code>
                      </td>
                      <td>
                        <code>{g.gene_id}</code>
                      </td>
                      <td className={styles.desc} title={g.description || ""}>
                        {g.description
                          ? g.description.replace(/\(LOC\d+\)$/, "")
                          : "—"}
                      </td>{" "}
                      <td>
                        {g.seqname}:{g.start_pos}–{g.end_pos}
                      </td>
                      {/* <td>
                        <span className={styles.biotypeBadge}>
                          {g.gene_biotype || "—"}
                        </span>
                      </td> */}
                    </tr>
                  ))}
                  {genes.length === 0 && (
                    <tr>
                      <td colSpan="6" className={styles.noData}>
                        No genes found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {total > limit && (
              <div className={styles.pagination}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ← Previous
                </button>
                <span>
                  Page {page} of {Math.ceil(total / limit)}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * limit >= total}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
