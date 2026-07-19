import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const rows = await query(
      `SELECT comparison,
              SUM(regulation = 'Upregulated') AS up_count,
              SUM(regulation = 'Downregulated') AS down_count,
              COUNT(*) AS total
       FROM deg_results
       GROUP BY comparison
       ORDER BY comparison`,
    );
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching comparisons:", error);
    return NextResponse.json(
      { error: "Failed to fetch comparisons" },
      { status: 500 },
    );
  }
}
