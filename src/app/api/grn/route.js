// app/api/grn/route.js
import { NextResponse } from "next/server";
import { getFilteredNetwork } from "@/lib/grn-data";

// Query params:
//   mode   = "full" | "gene" | "family"   (default "full")
//   search = gene ID, only read when mode=gene
//   family = TF family name, only read when mode=family
export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("mode") || "full";
  const params = {
    mode,
    search: searchParams.get("search") || "",
    family: searchParams.get("family") || "",
  };

  try {
    const result = await getFilteredNetwork(params);
    return NextResponse.json(result);
  } catch (err) {
    console.error("GRN query failed:", err);
    return NextResponse.json(
      { error: "Failed to load network data from the database" },
      { status: 500 },
    );
  }
}
