import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  const geneId = request.nextUrl.searchParams.get("geneId");
  if (!geneId)
    return NextResponse.json({ error: "Missing geneId" }, { status: 400 });
  try {
    const [rows] = await query("SELECT * FROM genes WHERE gene_id = ?", [
      geneId,
    ]);
    return NextResponse.json(rows || null);
  } catch (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
