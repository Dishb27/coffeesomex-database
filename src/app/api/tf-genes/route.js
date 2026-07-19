import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  const searchParams = request.nextUrl.searchParams;
  const family = searchParams.get("family") || "";
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const offset = (page - 1) * limit;

  try {
    // Build WHERE clause and parameter array
    let whereClause = "1=1";
    const params = [];

    if (family) {
      whereClause += " AND tf.family = ?";
      params.push(family);
    }
    if (search) {
      whereClause +=
        " AND (g.gene_id LIKE ? OR g.gene_symbol LIKE ? OR g.description LIKE ?)";
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    // Count query
    const countSql = `
      SELECT COUNT(*) AS total
      FROM transcription_factors tf
      JOIN genes g ON tf.gene_id = g.gene_id
      WHERE ${whereClause}
    `;
    console.log("🔍 Count SQL:", countSql);
    console.log("🔢 Count params:", params);
    const countRows = await query(countSql, params);
    const total = countRows[0]?.total || 0;

    // Data query
    const dataParams = [...params, limit, offset];
    const dataSql = `
      SELECT 
        tf.tf_id,
        g.gene_id,
        g.gene_symbol,
        g.description,
        g.seqname,
        g.start_pos,
        g.end_pos,
        g.gene_biotype
      FROM transcription_factors tf
      JOIN genes g ON tf.gene_id = g.gene_id
      WHERE ${whereClause}
      ORDER BY g.gene_symbol
      LIMIT ? OFFSET ?
    `;
    console.log("🔍 Data SQL:", dataSql);
    console.log("🔢 Data params:", dataParams);
    const rows = await query(dataSql, dataParams);

    return NextResponse.json({
      genes: rows,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("❌ Error in /api/tf-genes:", error);
    // Also log the SQL that caused the error (if available)
    if (error.sql) console.error("💣 SQL:", error.sql);
    if (error.sqlMessage) console.error("💬 Message:", error.sqlMessage);
    return NextResponse.json(
      { error: "Failed to fetch genes", details: error.message },
      { status: 500 },
    );
  }
}
