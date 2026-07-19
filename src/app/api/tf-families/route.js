import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const rows = await query(`
      SELECT family, COUNT(*) AS gene_count
      FROM transcription_factors
      GROUP BY family
      ORDER BY family
    `);
    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch families" },
      { status: 500 },
    );
  }
}
