"use client";

export function GOAnnotations({ annotations }) {
  if (!annotations || annotations.length === 0) {
    return (
      <div className="section">
        <h3 className="section-title">Gene Ontology (GO) Annotations</h3>
        <p className="empty-state">
          No GO annotations available for this gene.
        </p>
      </div>
    );
  }

  // Group by category (BP, MF, CC)
  const grouped = annotations.reduce((acc, ann) => {
    const cat = ann.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(ann);
    return acc;
  }, {});

  const categoryLabels = {
    BP: "Biological Process",
    MF: "Molecular Function",
    CC: "Cellular Component",
  };

  return (
    <div className="section">
      <h3 className="section-title">Gene Ontology (GO) Annotations</h3>
      <div className="go-annotations">
        {Object.entries(grouped).map(([cat, terms]) => (
          <div key={cat} className="go-category">
            <h4 className="go-category-title">
              {categoryLabels[cat] || cat}
              <span className="go-count">({terms.length})</span>
            </h4>
            <ul className="go-term-list">
              {terms.map((ann, idx) => (
                <li key={idx} className="go-term-item">
                  <span className="go-id">{ann.go_id}</span>
                  <span className="go-description">{ann.go_description}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <style jsx>{`
        .section {
          margin: 32px 0;
          background: var(--card-bg, #fff);
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .section-title {
          font-size: 1.2rem;
          font-weight: 600;
          margin-bottom: 16px;
          color: var(--ink-primary, #1a1a1a);
          border-bottom: 2px solid var(--border-light, #eaeaea);
          padding-bottom: 8px;
        }
        .empty-state {
          color: var(--ink-dim, #6b6b6b);
          font-style: italic;
        }
        .go-category {
          margin-bottom: 20px;
        }
        .go-category-title {
          font-size: 1rem;
          font-weight: 500;
          margin-bottom: 8px;
          color: var(--ink-secondary, #333);
        }
        .go-count {
          font-weight: 400;
          color: var(--ink-dim, #6b6b6b);
          font-size: 0.9rem;
          margin-left: 8px;
        }
        .go-term-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-wrap: wrap;
          gap: 8px 16px;
        }
        .go-term-item {
          font-size: 0.9rem;
          background: var(--bg-subtle, #f5f5f5);
          padding: 4px 12px;
          border-radius: 16px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .go-id {
          font-family: monospace;
          color: var(--primary, #0066cc);
          font-weight: 500;
        }
        .go-description {
          color: var(--ink-primary, #1a1a1a);
        }
      `}</style>
    </div>
  );
}
