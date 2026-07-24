import { notFound } from "next/navigation";
import { query } from "@/lib/db";
import { CoffeeDBLogo } from "@/components/CoffeeDBLogo";
import { SequenceDivider } from "@/components/SequenceDivider";
import { GeneHeader } from "@/components/GeneHeader";
import {
  TranscriptViewer,
  ProteinSequences,
  TFFamilies,
} from "@/components/GeneDetail";
import { ExpressionProfile } from "@/components/ExpressionProfile";
import { RetryButton } from "@/components/RetryButton";
import SiteHeader from "@/components/SiteHeader";
import { GOAnnotations } from "@/components/GOAnnotations";
import SiteFooter from "@/components/SiteFooter";

// A protein row is "real" only if it has an id and a sequence that isn't the
// literal placeholder string some source files use for missing data.
function isRealProtein(p) {
  return (
    p &&
    p.protein_id &&
    p.protein_id !== "NA" &&
    p.sequence &&
    p.sequence !== "NA"
  );
}

export default async function GenePage({ params }) {
  const geneId = params.id.toUpperCase();

  try {
    // 1. Gene
    const geneRows = await query(
      `SELECT gene_id, seqname, source, start_pos AS start, end_pos AS end,
              strand, gene_biotype, description
       FROM genes WHERE gene_id = ?`,
      [geneId],
    );
    if (geneRows.length === 0) notFound();
    const gene = geneRows[0];

    if (gene.description) {
      gene.description = gene.description.replace(/\s*\(LOC\d+\)$/, "");
    }

    // 2. Transcripts
    const transcriptRows = await query(
      `SELECT transcript_id, source, start_pos AS start, end_pos AS end,
              strand, transcript_biotype, product
       FROM transcripts WHERE gene_id = ? ORDER BY start`,
      [geneId],
    );

    // 3. Exons
    const exonRows = await query(
      `SELECT transcript_id, exon_number, start_pos AS start, end_pos AS end, strand
       FROM exons WHERE gene_id = ?
       ORDER BY transcript_id, exon_number`,
      [geneId],
    );

    // 4. CDS — only meaningful once this table has rows for a gene.
    // When empty (as it is today) every downstream CDS-derived structure
    // below simply stays empty, and the UI falls back to gene-level proteins.
    const cdsRows = await query(
      `SELECT transcript_id, cds_id, protein_id,
              start_pos AS start, end_pos AS end, strand,
              sequence, length
       FROM cds WHERE gene_id = ?
       ORDER BY transcript_id, start`,
      [geneId],
    );
    const hasCdsData = cdsRows.length > 0;

    // 5. Proteins linked via CDS.protein_id (only queried if CDS exists)
    const proteinIdsFromCds = hasCdsData
      ? [...new Set(cdsRows.map((c) => c.protein_id).filter(Boolean))]
      : [];

    let proteinRowsFromCds = [];
    if (proteinIdsFromCds.length > 0) {
      const placeholders = proteinIdsFromCds.map(() => "?").join(",");
      proteinRowsFromCds = await query(
        `SELECT protein_id, sequence FROM proteins WHERE protein_id IN (${placeholders})`,
        proteinIdsFromCds,
      );
    }
    const proteinMap = Object.fromEntries(
      proteinRowsFromCds.filter(isRealProtein).map((p) => [p.protein_id, p]),
    );

    // 6. Gene-level proteins (direct fallback — this is the path that
    // currently carries all real protein data since `cds` is empty)
    const directProteinRowsRaw = await query(
      `SELECT protein_id, sequence FROM proteins WHERE gene_id = ?`,
      [geneId],
    );
    const directProteinRows = directProteinRowsRaw.filter(isRealProtein);

    // 7. Group exons / CDS by transcript
    const exonMap = {};
    exonRows.forEach((e) => {
      (exonMap[e.transcript_id] ??= []).push(e);
    });

    const cdsMap = {};
    cdsRows.forEach((c) => {
      (cdsMap[c.transcript_id] ??= []).push(c);
    });

    // 8. Concatenated CDS sequence per protein (only runs when CDS has data)
    const cdsSeqMap = {};
    if (hasCdsData) {
      const cdsByTranscript = {};
      cdsRows.forEach((c) => {
        (cdsByTranscript[c.transcript_id] ??= []).push(c);
      });
      for (const segs of Object.values(cdsByTranscript)) {
        segs.sort((a, b) => a.start - b.start);
        const fullSeq = segs
          .map((s) => s.sequence)
          .filter(Boolean)
          .join("");
        const proteinId = segs[0].protein_id;
        if (proteinId && fullSeq) {
          cdsSeqMap[proteinId] = {
            protein_id: proteinId,
            sequence: fullSeq,
            length: fullSeq.length,
          };
        }
      }
    }

    // 9. Union of transcript IDs from every source that mentions one
    const allTranscriptIds = new Set([
      ...transcriptRows.map((t) => t.transcript_id),
      ...Object.keys(exonMap),
      ...Object.keys(cdsMap),
    ]);

    // 10. Enriched transcripts
    const transcripts = Array.from(allTranscriptIds).map((tid) => {
      const existing = transcriptRows.find((t) => t.transcript_id === tid);
      const base = existing
        ? { ...existing }
        : {
            transcript_id: tid,
            source: null,
            start: null,
            end: null,
            strand: null,
            transcript_biotype: null,
            product: null,
          };

      const cdsSegments = cdsMap[tid] || [];
      const cds = cdsSegments[0] || null;
      const protein = cds?.protein_id
        ? proteinMap[cds.protein_id] || null
        : null;
      const cdsSequence = cds?.protein_id
        ? cdsSeqMap[cds.protein_id] || null
        : null;

      return {
        ...base,
        exons: exonMap[tid] || [],
        cds,
        cds_segments: cdsSegments,
        protein,
        cds_sequence: cdsSequence,
        protein_sequence: protein?.sequence || cdsSequence?.sequence || null,
      };
    });

    const validTranscripts = transcripts.filter(
      (t) => !t.transcript_id.includes(";"),
    );
    gene.transcript_count = validTranscripts.length;

    // 11. Expression
    const expressionRows = await query(
      `SELECT s.sample_id, s.sample_name, s.stage_tag, s.replicate, e.expression
       FROM expression e JOIN samples s ON e.stage_tag = s.stage_tag
       WHERE e.gene_id = ? ORDER BY s.stage_tag, s.replicate`,
      [geneId],
    );

    // 12. Transcription factors
    const tfRows = await query(
      `SELECT tf_id AS protein_id, family AS tf_family
       FROM transcription_factors WHERE gene_id = ?`,
      [geneId],
    );

    // 13. GO annotations
    const goRows = await query(
      `SELECT go_id, go_description, category
       FROM gene_go_annotations
       WHERE gene_id = ?
       ORDER BY category, go_id`,
      [geneId],
    );

    return (
      <div className="gene-page-container">
        <SiteHeader pageTitle={`Gene ${gene.gene_id}`} />
        <div className="gene-page-inner">
          <GeneHeader gene={gene} tfCount={tfRows.length} />
          <TranscriptViewer transcripts={validTranscripts} />
          <ProteinSequences
            transcripts={validTranscripts}
            geneId={gene.gene_id}
            geneProteins={directProteinRows}
            hasCdsData={hasCdsData}
          />
          {expressionRows.length > 0 && (
            <ExpressionProfile expressionRows={expressionRows} />
          )}
          {tfRows.length > 0 && <TFFamilies tfRows={tfRows} />}
          {goRows.length > 0 && <GOAnnotations annotations={goRows} />}
        </div>
        <SiteFooter />
      </div>
    );
  } catch (error) {
    console.error("Unhandled error in GenePage:", error);
    return (
      <div className="gene-page-container" style={{ padding: "40px 20px" }}>
        <div
          className="error-state"
          style={{
            borderRadius: "12px",
            padding: "40px 32px",
            textAlign: "center",
          }}
        >
          <h2 style={{ fontSize: "1.5rem", marginBottom: "12px" }}>
            ⚠️ Something went wrong
          </h2>
          <p style={{ color: "var(--ink-dim)", marginBottom: "16px" }}>
            Could not load data for gene <strong>{geneId}</strong>.
          </p>
          <p style={{ fontSize: "0.85rem", color: "var(--ink-faint)" }}>
            {error.message}
          </p>
          <RetryButton />
        </div>
      </div>
    );
  }
}
