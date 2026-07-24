"use client";

import { useState } from "react";

/* ============================================================
   EXON / INTRON STRUCTURE VIEWER
   ============================================================ */

function buildDiagramData(transcript) {
  const exons = [...(transcript.exons || [])].sort((a, b) => a.start - b.start);
  if (exons.length === 0) return { exons: [], minStart: 0, maxEnd: 1 };

  const minStart = Math.min(...exons.map((e) => e.start));
  const maxEnd = Math.max(...exons.map((e) => e.end));

  const cdsSegs = transcript.cds_segments?.length
    ? transcript.cds_segments
    : transcript.cds
      ? [transcript.cds]
      : [];

  const withCoding = exons.map((exon) => {
    const codingRanges = cdsSegs
      .filter((c) => c.end >= exon.start && c.start <= exon.end)
      .map((c) => [Math.max(c.start, exon.start), Math.min(c.end, exon.end)]);
    return { ...exon, codingRanges };
  });

  return { exons: withCoding, minStart, maxEnd };
}

export function TranscriptViewer({ transcripts }) {
  const [active, setActive] = useState(0);
  if (!transcripts || transcripts.length === 0) {
    return (
      <section className="section-card">
        <div className="section-header">
          <h2>Gene structure</h2>
        </div>
        <div className="empty-state">No transcript data available.</div>
      </section>
    );
  }

  const t = transcripts[active] || transcripts[0];
  const exons = [...(t.exons || [])].sort((a, b) => a.start - b.start);
  if (exons.length === 0) {
    return (
      <section className="section-card" id="structure">
        <div className="section-header">
          <h2>Gene structure</h2>
        </div>
        <div className="empty-state">No exon data for this transcript.</div>
      </section>
    );
  }
  const minStart = exons[0].start;
  const maxEnd = exons[exons.length - 1].end;
  const span = Math.max(maxEnd - minStart, 1);
  const intronCount = Math.max(exons.length - 1, 0);

  const leftLabel = t.strand === "-" ? "3′" : "5′";
  const rightLabel = t.strand === "-" ? "5′" : "3′";

  const W = 1000;
  const H = 80;
  const trackY = H / 2 + 4;
  const toX = (pos) => ((pos - minStart) / span) * W;

  return (
    <section className="section-card" id="structure">
      <div className="section-header">
        <h2>Gene Structure</h2>
        <span className="badge">
          {transcripts.length} transcript{transcripts.length > 1 ? "s" : ""}
        </span>
      </div>

      {transcripts.length > 1 && (
        <div className="tv-tabs">
          {transcripts.map((tr, i) => (
            <button
              key={tr.transcript_id}
              type="button"
              className={`tv-tab ${i === active ? "tv-tab-active" : ""}`}
              onClick={() => setActive(i)}
            >
              {tr.transcript_id}
            </button>
          ))}
        </div>
      )}

      {/* <div className="tv-meta">
        <span className="tv-meta-item">
          <strong>{t.transcript_biotype || "unknown"}</strong>
        </span>
        <span className="tv-meta-item">
          {t.product || "No product annotation"}
        </span>
        <span className="tv-meta-item">
          {t.start.toLocaleString()} – {t.end.toLocaleString()} ({t.strand})
        </span>
      </div> */}

      <div className="tv-count-row">
        <div className="tv-count-pill">
          <div className="tv-count-num">{exons.length}</div>
          <div className="tv-count-label">Exons</div>
        </div>
        <div className="tv-count-pill">
          <div className="tv-count-num">{intronCount}</div>
          <div className="tv-count-label">Introns</div>
        </div>
        <div className="tv-count-pill">
          <div className="tv-count-num">
            {(maxEnd - minStart + 1).toLocaleString()}
          </div>
          <div className="tv-count-label">Length (bp)</div>
        </div>
      </div>

      <div className="tv-diagram-wrap">
        <svg
          viewBox={`-60 -20 ${W + 120} ${H + 40}`} // extra space for labels
          className="tv-diagram"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`Exon‑intron structure for ${t.transcript_id}`}
        >
          {/* 5′ / 3′ labels – placed well outside the intron line */}
          <text
            x={-20}
            y={trackY + 6}
            textAnchor="end"
            className="tv-end-label"
          >
            {leftLabel}
          </text>
          <text
            x={W + 20}
            y={trackY + 6}
            textAnchor="start"
            className="tv-end-label"
          >
            {rightLabel}
          </text>

          {/* Intron line */}
          <line
            x1={0}
            y1={trackY}
            x2={W}
            y2={trackY}
            className="tv-intron-line"
          />

          {/* Exon boxes – no E labels, no arrows */}
          {exons.map((exon, idx) => {
            const x = toX(exon.start);
            const w = Math.max(toX(exon.end) - x, 2);
            return (
              <rect
                key={idx}
                x={x}
                y={trackY - 12}
                width={w}
                height={24}
                rx={6}
                className="tv-exon-box"
              >
                <title>{`Exon ${exon.exon_number}: ${exon.start}-${exon.end}`}</title>
              </rect>
            );
          })}
        </svg>
        <div className="tv-coord-row">
          <span>{minStart.toLocaleString()}</span>
          <span>{maxEnd.toLocaleString()}</span>
        </div>
      </div>

      <div className="tv-legend">
        <span>
          <i className="tv-legend-exon" /> Exon
        </span>
        <span>
          <i className="tv-legend-intron" /> Intron
        </span>
      </div>
    </section>
  );
}

/* ============================================================
   SEQUENCES — Protein & Coding Sequence display
   ============================================================ */

function wrapSequence(seq, width = 60) {
  const lines = [];
  for (let i = 0; i < seq.length; i += width) {
    lines.push(seq.slice(i, i + width));
  }
  return lines.join("\n");
}

function downloadFasta(header, sequence, filename) {
  const content = `>${header}\n${wrapSequence(sequence)}\n`;
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadAll(geneId, transcripts, geneProteins, hasCdsData) {
  let content = "";

  transcripts.forEach((t) => {
    if (t.protein?.sequence) {
      content += `>${t.protein.protein_id} | transcript=${t.transcript_id} | gene=${geneId}\n`;
      content += `${wrapSequence(t.protein.sequence)}\n`;
    }
    if (hasCdsData && t.cds_sequence?.sequence) {
      const idTag = t.protein?.protein_id || t.transcript_id;
      content += `>${idTag}_CDS | transcript=${t.transcript_id} | gene=${geneId}\n`;
      content += `${wrapSequence(t.cds_sequence.sequence)}\n`;
    }
  });

  geneProteins.forEach((gp) => {
    content += `>${gp.protein_id} | gene=${geneId}\n`;
    content += `${wrapSequence(gp.sequence)}\n`;
  });

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${geneId}_sequences.fasta`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function SequenceBlock({ meta, sequence, header, filename }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(sequence);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <div className="seq-block">
      <div className="seq-meta">
        <span className="sqx-meta-right" style={{ marginLeft: "auto" }}>
          <span>{meta}</span>
          <button type="button" className="sqx-btn" onClick={handleCopy}>
            {copied ? "✓ Copied" : "⧉ Copy"}
          </button>
          <button
            type="button"
            className="sqx-btn"
            onClick={() => downloadFasta(header, sequence, filename)}
          >
            ⬇ FASTA
          </button>
        </span>
      </div>
      <pre className="sqx-text">{wrapSequence(sequence)}</pre>
    </div>
  );
}

/**
 * Renders protein and coding-sequence cards for a gene.
 *
 * Data sources, merged without duplication:
 *  - transcript-linked (via cds -> proteins), only active once `hasCdsData`
 *    is true and this gene's transcripts actually resolve a CDS/protein
 *  - gene-level (direct `proteins WHERE gene_id = ?` lookup) — the fallback
 *    that currently carries all real data while `cds` is unpopulated
 *
 * Every sequence is shown under its own real protein ID; no source labels
 * or provenance tags are attached to the display.
 */
export function ProteinSequences({
  transcripts,
  geneId,
  geneProteins = [],
  hasCdsData = false,
}) {
  const proteinItems = [];
  const cdsItems = [];
  const seenProteinIds = new Set();

  // Transcript-linked sequences (only populated once CDS data exists)
  transcripts.forEach((t) => {
    const protein = t.protein;
    const proteinSeq = protein?.sequence || t.protein_sequence || null;
    const proteinId = protein?.protein_id || t.transcript_id;

    if (proteinSeq && !seenProteinIds.has(proteinId)) {
      seenProteinIds.add(proteinId);
      proteinItems.push({
        key: proteinId,
        proteinId,
        transcriptId: t.transcript_id,
        sequence: proteinSeq,
        length: proteinSeq.length,
        header: `${proteinId} | gene=${geneId}`,
        filename: `${proteinId}.fasta`,
      });
    }

    if (hasCdsData && t.cds_sequence?.sequence) {
      cdsItems.push({
        key: `${proteinId}_CDS`,
        proteinId,
        transcriptId: t.transcript_id,
        sequence: t.cds_sequence.sequence,
        length: t.cds_sequence.length,
        header: `${proteinId}_CDS | gene=${geneId}`,
        filename: `${proteinId}_CDS.fasta`,
      });
    }
  });

  // Gene-level proteins — merged in under their own real ID, no tagging
  geneProteins.forEach((gp) => {
    if (seenProteinIds.has(gp.protein_id)) return;
    seenProteinIds.add(gp.protein_id);
    proteinItems.push({
      key: gp.protein_id,
      proteinId: gp.protein_id,
      transcriptId: null,
      sequence: gp.sequence,
      length: gp.sequence.length,
      header: `${gp.protein_id} | gene=${geneId}`,
      filename: `${gp.protein_id}.fasta`,
    });
  });

  const hasProtein = proteinItems.length > 0;
  const hasCds = cdsItems.length > 0;

  const renderCard = (items, unit, title) => {
    if (items.length === 0) return null;
    return (
      <section className="section-card" style={{ marginBottom: "24px" }}>
        <div className="section-header">
          <h2>{title}</h2>
          <span className="badge">
            {items.length} sequence{items.length > 1 ? "s" : ""}
          </span>
        </div>
        {items.map((item) => (
          <div key={item.key} className="sqx-entry">
            <h3 className="sqx-entry-title">
              {item.proteinId}
              {item.transcriptId && (
                <span className="sqx-entry-sub">from {item.transcriptId}</span>
              )}
            </h3>
            <SequenceBlock
              meta={`${item.length.toLocaleString()} ${unit}`}
              sequence={item.sequence}
              header={item.header}
              filename={item.filename}
            />
          </div>
        ))}
      </section>
    );
  };

  if (!hasProtein && !hasCds) {
    return (
      <section className="section-card">
        <div className="section-header">
          <h2>Protein and Coding Sequences</h2>
        </div>
        <div className="empty-state">
          No protein or coding sequence is stored for this gene yet.
        </div>
      </section>
    );
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "16px",
        }}
      >
        <button
          type="button"
          className="sqx-download-all"
          onClick={() =>
            downloadAll(geneId, transcripts, geneProteins, hasCdsData)
          }
        >
          ⬇ Download all (FASTA)
        </button>
      </div>

      {renderCard(proteinItems, "amino acids", "Protein Sequences")}

      {hasCdsData &&
        (hasCds ? (
          renderCard(cdsItems, "bp", "Coding Sequences")
        ) : (
          <section className="section-card" style={{ marginBottom: "24px" }}>
            <div className="section-header">
              <h2>Coding Sequences</h2>
            </div>
            <div className="empty-state">
              No CDS sequence linked to this gene's transcripts.
            </div>
          </section>
        ))}
    </>
  );
}

/* ============================================================
   TRANSCRIPTION FACTOR FAMILIES
   ============================================================ */

export function TFFamilies({ tfRows }) {
  if (!tfRows || tfRows.length === 0) return null;

  const groups = {};
  tfRows.forEach((tf) => {
    (groups[tf.tf_family] ??= []).push(tf.protein_id);
  });
  const families = Object.entries(groups).sort(
    (a, b) => b[1].length - a[1].length,
  );

  return (
    <section className="section-card">
      <div className="section-header">
        <h2>Transcription factor families</h2>
        <span className="badge">
          {families.length} famil{families.length === 1 ? "y" : "ies"} ·{" "}
          {tfRows.length} protein
          {tfRows.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="tff-grid">
        {families.map(([family, proteinIds]) => (
          <div key={family} className="tff-card">
            <div className="tff-card-header">
              <span className="tff-family-name">{family}</span>
              <span className="tff-count">{proteinIds.length}</span>
            </div>
            <div className="tff-protein-list">
              {proteinIds.map((pid) => (
                <span key={pid} className="tff-protein-chip">
                  {pid}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
