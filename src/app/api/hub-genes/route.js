import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import hubGenes from "@/data/hubGenes.json";

export async function GET() {
  try {
    const geneIds = hubGenes.map((item) => item.gene_id);
    const placeholders = geneIds.map(() => "?").join(",");
    const rows = await query(
      `
      SELECT 
        gene_id,
        gene_symbol,
        description,
        gene_biotype,
        seqname,
        start_pos,
        end_pos
      FROM genes
      WHERE gene_id IN (${placeholders})
    `,
      geneIds,
    );

    // Merge with score
    const result = rows.map((row) => {
      const hub = hubGenes.find((h) => h.gene_id === row.gene_id);
      return {
        ...row,
        score: hub?.score || 50, // default if missing
      };
    });

    // Sort by score descending (hubness)
    result.sort((a, b) => b.score - a.score);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching hub genes:", error);
    return NextResponse.json(
      { error: "Failed to fetch hub genes" },
      { status: 500 },
    );
  }
}
