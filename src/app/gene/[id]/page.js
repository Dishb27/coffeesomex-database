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

export default async function GenePage({ params }) {
  const geneId = params.id.toUpperCase();
  console.log("\n🔍 ===== GenePage debug for", geneId, "=====");

  try {
    // 1. Gene
    console.log("1️⃣ Fetching gene...");
    const geneRows = await query(
      `SELECT gene_id, seqname, source, start_pos AS start, end_pos AS end,
              strand, gene_biotype, description
       FROM genes WHERE gene_id = ?`,
      [geneId],
    );
    console.log(`   Gene rows: ${geneRows.length}`);
    if (geneRows.length === 0) {
      console.log("   ❌ Gene not found – calling notFound()");
      notFound();
    }
    const gene = geneRows[0];

    // Remove trailing (LOCxxxxxxxxx) from description
    if (gene.description) {
      gene.description = gene.description.replace(/\s*\(LOC\d+\)$/, "");
    }

    console.log("   ✅ Gene found:", gene.gene_id);

    // 2. Transcripts
    console.log("2️⃣ Fetching transcripts...");
    const transcriptRows = await query(
      `SELECT transcript_id, source, start_pos AS start, end_pos AS end,
              strand, transcript_biotype, product
       FROM transcripts WHERE gene_id = ? ORDER BY start`,
      [geneId],
    );
    console.log(`   Transcripts found: ${transcriptRows.length}`);

    // 3. Exons (by gene_id)
    console.log("3️⃣ Fetching exons (by gene_id)...");
    const exonRows = await query(
      `SELECT transcript_id, exon_number, start_pos AS start, end_pos AS end, strand
       FROM exons WHERE gene_id = ?
       ORDER BY transcript_id, exon_number`,
      [geneId],
    );
    console.log(`   Exons found: ${exonRows.length}`);

    // 4. CDS (by gene_id)
    console.log("4️⃣ Fetching CDS (by gene_id)...");
    const cdsRows = await query(
      `SELECT transcript_id, cds_id, protein_id,
              start_pos AS start, end_pos AS end, strand,
              sequence, length
       FROM cds WHERE gene_id = ?
       ORDER BY transcript_id, start`,
      [geneId],
    );
    console.log(`   CDS segments found: ${cdsRows.length}`);

    // 5. Protein IDs from CDS
    const proteinIds = [
      ...new Set(cdsRows.map((c) => c.protein_id).filter(Boolean)),
    ];
    console.log(`   Unique protein IDs from CDS: ${proteinIds.length}`);

    let proteinRows = [];
    if (proteinIds.length > 0) {
      const pp = proteinIds.map(() => "?").join(",");
      console.log("5️⃣ Fetching protein sequences via CDS...");
      proteinRows = await query(
        `SELECT protein_id, sequence FROM proteins WHERE protein_id IN (${pp})`,
        proteinIds,
      );
      console.log(`   Protein rows found via CDS: ${proteinRows.length}`);
    }

    // ---- NEW: Direct gene-level protein fetch (fallback) ----
    console.log("5b️⃣ Fetching proteins directly by gene_id...");
    const directProteinRows = await query(
      `SELECT protein_id, sequence FROM proteins WHERE gene_id = ?`,
      [geneId],
    );
    console.log(`   Direct protein rows: ${directProteinRows.length}`);

    // Build proteinMap from CDS-linked proteins
    const proteinMap = Object.fromEntries(
      proteinRows.map((p) => [p.protein_id, p]),
    );

    // 6. Build maps for exons and CDS by transcript
    const exonMap = {};
    exonRows.forEach((e) => {
      (exonMap[e.transcript_id] ??= []).push(e);
    });

    const cdsMap = {};
    cdsRows.forEach((c) => {
      (cdsMap[c.transcript_id] ??= []).push(c);
    });

    // 7. Build concatenated CDS sequences per protein
    const cdsSeqMap = {};
    if (cdsRows.length > 0) {
      const cdsByTranscript = {};
      cdsRows.forEach((c) => {
        (cdsByTranscript[c.transcript_id] ??= []).push(c);
      });
      for (const [transcriptId, segs] of Object.entries(cdsByTranscript)) {
        segs.sort((a, b) => a.start - b.start);
        const fullSeq = segs.map((s) => s.sequence).join("");
        const proteinId = segs[0].protein_id;
        if (proteinId) {
          cdsSeqMap[proteinId] = {
            protein_id: proteinId,
            sequence: fullSeq,
            length: fullSeq.length,
          };
        }
      }
    }

    // 8. Collect all transcript IDs from all sources
    const allTranscriptIds = new Set([
      ...transcriptRows.map((t) => t.transcript_id),
      ...Object.keys(exonMap),
      ...Object.keys(cdsMap),
    ]);

    // 9. Build enriched transcripts
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

      let protein_sequence = null;
      if (protein?.sequence) {
        protein_sequence = protein.sequence;
      } else if (cdsSequence?.sequence) {
        protein_sequence = cdsSequence.sequence;
      }

      return {
        ...base,
        exons: exonMap[tid] || [],
        cds,
        cds_segments: cdsSegments,
        protein,
        cds_sequence: cdsSequence,
        protein_sequence,
      };
    });

    // Filter out malformed transcript IDs
    const validTranscripts = transcripts.filter(
      (t) => !t.transcript_id.includes(";"),
    );
    gene.transcript_count = validTranscripts.length;

    // 10. Expression
    console.log("6️⃣ Fetching expression...");
    const expressionRows = await query(
      `SELECT s.sample_id, s.sample_name, s.stage_tag, s.replicate, e.expression
       FROM expression e JOIN samples s ON e.stage_tag = s.stage_tag
       WHERE e.gene_id = ? ORDER BY s.stage_tag, s.replicate`,
      [geneId],
    );
    console.log(`   Expression rows: ${expressionRows.length}`);

    // 11. Transcription factors
    console.log("7️⃣ Fetching transcription factors...");
    const tfRows = await query(
      `SELECT tf_id AS protein_id, family AS tf_family
       FROM transcription_factors WHERE gene_id = ?`,
      [geneId],
    );
    console.log(`   TF rows: ${tfRows.length}`);

    // 12. GO annotations
    console.log("8️⃣ Fetching GO annotations...");
    const goRows = await query(
      `SELECT go_id, go_description, category
       FROM gene_go_annotations
       WHERE gene_id = ?
       ORDER BY category, go_id`,
      [geneId],
    );
    console.log(`   GO rows: ${goRows.length}`);

    console.log("✅ Debug complete.\n");

    // 13. Render
    return (
      <div className="gene-page-container">
        <SiteHeader pageTitle={`Gene ${gene.gene_id}`} />
        <div className="gene-page-inner">
          <GeneHeader gene={gene} tfCount={tfRows.length} />
          <TranscriptViewer transcripts={validTranscripts} />
          <ProteinSequences
            transcripts={validTranscripts}
            geneId={gene.gene_id}
            geneProteins={directProteinRows} // <-- pass fallback proteins
          />
          <ExpressionProfile expressionRows={expressionRows} />
          <TFFamilies tfRows={tfRows} />
          <GOAnnotations annotations={goRows} />
        </div>

        <footer className="footer" style={{ marginTop: "48px" }}>
          <div className="footer-inner">
            <CoffeeDBLogo />
            <div className="footer-links">
              <button className="footer-link">Contact us</button>
            </div>
          </div>
          <p className="footer-copy">© 2025 CoffeeDB · For research use</p>
        </footer>
      </div>
    );
  } catch (error) {
    console.error("🔥 Unhandled error in GenePage:", error);
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
