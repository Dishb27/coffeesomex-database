import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request, { params }) {
  const { comparision } = params;

  if (!comparision) {
    return NextResponse.json(
      { error: "Comparison parameter is required" },
      { status: 400 },
    );
  }

  try {
    const rows = await query(
      `SELECT gene_id, regulation, log2FoldChange, padj
       FROM deg_results
       WHERE comparison = ?`,
      [comparision],
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: `No data found for comparison "${comparision}"` },
        { status: 404 },
      );
    }

    return NextResponse.json({ comparision, points: rows });
  } catch (error) {
    console.error(`Error fetching volcano data for ${comparision}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch volcano plot data" },
      { status: 500 },
    );
  }
}
