import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  const geneId = request.nextUrl.searchParams.get("geneId");
  if (!geneId) {
    return NextResponse.json({ error: "Missing geneId" }, { status: 400 });
  }

  try {
    const rows = await query(
      `SELECT 
         s.stage_tag,
         AVG(e.expression) AS avg_expression,
         STD(e.expression) AS std_expression,
         COUNT(e.sample_id) AS replicate_count
       FROM expression e
       JOIN samples s ON e.sample_id = s.sample_id
       WHERE e.gene_id = ?
       GROUP BY s.stage_tag
       ORDER BY s.stage_tag`,
      [geneId],
    );
    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch expression" },
      { status: 500 },
    );
  }
}
