import { NextResponse } from "next/server";
import { query } from "@/lib/db";

const SORT_COLUMNS = {
  abslog2fc: "ABS(log2FoldChange)",
  padj: "padj",
  gene_id: "gene_id",
};

export async function GET(request, { params }) {
  const { comparision } = params; // <-- singular, matches folder [comparision]

  if (!comparision) {
    return NextResponse.json(
      { error: "Comparison parameter is required" },
      { status: 400 },
    );
  }

  const { searchParams } = new URL(request.url);

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(
    200,
    Math.max(10, parseInt(searchParams.get("pageSize") || "50", 10) || 50),
  );
  const regulation = searchParams.get("regulation") || "all";
  const search = (searchParams.get("search") || "").trim();
  const sortKey = SORT_COLUMNS[searchParams.get("sortKey")]
    ? searchParams.get("sortKey")
    : "abslog2fc";
  const sortDir = searchParams.get("sortDir") === "asc" ? "ASC" : "DESC";
  const sortColumn = SORT_COLUMNS[sortKey];
  const offset = (page - 1) * pageSize;

  try {
    const summaryRows = await query(
      `SELECT
         COUNT(*) AS total,
         SUM(regulation = 'Upregulated') AS up,
         SUM(regulation = 'Downregulated') AS down
       FROM deg_results
       WHERE comparison = ?`,
      [comparision],
    );

    if (!summaryRows.length || summaryRows[0].total === 0) {
      return NextResponse.json(
        { error: `No data found for comparison "${comparision}"` },
        { status: 404 },
      );
    }

    const whereClauses = ["comparison = ?"];
    const whereParams = [comparision];

    if (regulation === "up") {
      whereClauses.push("regulation = 'Upregulated'");
    } else if (regulation === "down") {
      whereClauses.push("regulation = 'Downregulated'");
    }

    if (search) {
      whereClauses.push("gene_id LIKE ?");
      whereParams.push(`%${search}%`);
    }

    const whereSql = whereClauses.join(" AND ");

    const countRows = await query(
      `SELECT COUNT(*) AS cnt FROM deg_results WHERE ${whereSql}`,
      whereParams,
    );
    const filteredTotal = countRows[0].cnt;

    const dataRows = await query(
      `SELECT gene_id, regulation, log2FoldChange, pvalue, padj, baseMean, lfcSE, stat
       FROM deg_results
       WHERE ${whereSql}
       ORDER BY ${sortColumn} ${sortDir}
       LIMIT ${pageSize} OFFSET ${offset}`,
      whereParams,
    );

    return NextResponse.json({
      comparision,
      summary: {
        total: summaryRows[0].total,
        up: summaryRows[0].up,
        down: summaryRows[0].down,
      },
      data: dataRows,
      pagination: {
        page,
        pageSize,
        filteredTotal,
        totalPages: Math.max(1, Math.ceil(filteredTotal / pageSize)),
      },
    });
  } catch (error) {
    console.error(`Error fetching comparison ${comparision}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch comparison data" },
      { status: 500 },
    );
  }
}
