// src/components/GeneActions.jsx
"use client";

export function GeneActions({ geneId }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(geneId);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="gene-header-actions">
      <button onClick={handleCopy}>📋 Copy ID</button>
      <button onClick={handlePrint}>🖨️ Print</button>
    </div>
  );
}
