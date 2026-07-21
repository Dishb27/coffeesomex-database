const MOCK_DB = {
  COFFEA_G001234: {
    id: "COFFEA_G001234",
    organism: "Coffea arabica",
    chromosome: "Chr3",
    start: "14,220,301",
    end: "14,226,890",
    strand: "+",
    biotype: "protein-coding",
    product: "Caffeine synthase 1",
    status: "Reviewed",
  },
  COFFEA_G004521: {
    id: "COFFEA_G004521",
    organism: "Coffea canephora",
    chromosome: "Chr7",
    start: "8,104,009",
    end: "8,108,441",
    strand: "-",
    biotype: "protein-coding",
    product: "CYP450 monooxygenase",
    status: "Reviewed",
  },
  COFFEA_G007893: {
    id: "COFFEA_G007893",
    organism: "Coffea arabica",
    chromosome: "Chr11",
    start: "22,891,140",
    end: "22,895,302",
    strand: "+",
    biotype: "lncRNA",
    product: "Non-coding RNA CaLR-7",
    status: "Predicted",
  },
};

/**
 * Fetch a gene by ID.
 * Replace this body with your real API or database call, e.g.:
 *   const res = await fetch(`https://api.coffeedb.org/genes/${id}`);
 *   return res.ok ? res.json() : null;
 */
export async function fetchGene(id) {
  await new Promise((r) => setTimeout(r, 400)); // simulate network delay
  return MOCK_DB[id.toUpperCase()] ?? null;
}
