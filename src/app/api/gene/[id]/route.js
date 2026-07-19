import { NextResponse } from "next/server";
import { fetchGene } from "@/lib/geneService";

export async function GET(_req, { params }) {
  const id = decodeURIComponent(params.id).trim();

  if (!id) {
    return NextResponse.json({ error: "Gene ID is required." }, { status: 400 });
  }

  const gene = await fetchGene(id);

  if (!gene) {
    return NextResponse.json({ error: "Gene not found." }, { status: 404 });
  }

  return NextResponse.json(gene);
}
