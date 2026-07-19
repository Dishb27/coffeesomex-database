// src/components/SequenceDivider.jsx
export function SequenceDivider({ label }) {
  const bases = "ATCGGCTACGATTGCACGTAGCTTACGGATCCGATGCATTGCAGCTAGATCGTAGCATCG";
  const strip = bases.repeat(4);

  return (
    <div className="seq-divider">
      <div className="seq-divider-track" aria-hidden="true">
        <span>{strip}</span>
        <span>{strip}</span>
      </div>
      {label && <div className="seq-divider-label">{label}</div>}
    </div>
  );
}

export default SequenceDivider;
