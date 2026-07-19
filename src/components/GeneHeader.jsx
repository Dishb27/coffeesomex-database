// src/components/GeneHeader.jsx
"use client";

export function GeneHeader({ gene, tfCount }) {
  const geneLength = gene.end - gene.start + 1;

  return (
    <header className="gene-header">
      <div className="gene-header-top">
        <div className="gene-id-wrap">
          <h1>{gene.gene_id}</h1>
          {/* <span className={`gene-badge ${tfCount > 0 ? "tf" : ""}`}>
            {tfCount > 0 ? `TF (${tfCount})` : "Non-TF"}
          </span> */}
        </div>
        <div className="gene-header-actions">
          <button type="button" onClick={() => window.history.back()}>
            ← Back
          </button>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(gene.gene_id)}
          >
            📋 Copy ID
          </button>
        </div>
      </div>

      {gene.description && gene.description !== "NA" && (
        <div className="gene-description">{gene.description}</div>
      )}

      <div className="gene-meta-grid">
        <div className="gene-meta-item">
          <span className="label">Chromosome</span>
          <span className="value">{gene.seqname || "—"}</span>
        </div>
        <div className="gene-meta-item">
          <span className="label">Source</span>
          <span className="value">{gene.source || "—"}</span>
        </div>
        <div className="gene-meta-item">
          <span className="label">Start</span>
          <span className="value mono">{gene.start.toLocaleString()}</span>
        </div>
        <div className="gene-meta-item">
          <span className="label">End</span>
          <span className="value mono">{gene.end.toLocaleString()}</span>
        </div>
        <div className="gene-meta-item">
          <span className="label">Length (bp)</span>
          <span className="value mono">{geneLength.toLocaleString()}</span>
        </div>
        <div className="gene-meta-item">
          <span className="label">Strand</span>
          <span className="value mono">{gene.strand || "—"}</span>
        </div>
        <div className="gene-meta-item">
          <span className="label">Biotype</span>
          <span className="value">{gene.gene_biotype || "—"}</span>
        </div>
        <div className="gene-meta-item">
          <span className="label">DB Xref</span>
          <span className="value mono">{gene.db_xref || "—"}</span>
        </div>
      </div>
    </header>
  );
}
