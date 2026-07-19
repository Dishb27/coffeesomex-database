"use client";

import { useState, useMemo } from "react";

// ============================================================
// 1. STAGE DEFINITIONS (with image filenames – kept for completeness)
// ============================================================
const STAGES = [
  {
    code: "L1",
    sTag: "S01",
    img: "1.jpg",
    title: "L1",
    desc: "Leaves from greenhouse plants",
  },
  {
    code: "D1",
    sTag: "S02",
    img: "2.jpg",
    title: "D1",
    desc: "Explants during dedifferentiation (1 week)",
  },
  {
    code: "D2",
    sTag: "S03",
    img: "3.jpg",
    title: "D2",
    desc: "Explants during dedifferentiation (2 weeks)",
  },
  {
    code: "D3",
    sTag: "S04",
    img: "4.jpg",
    title: "D3",
    desc: "Explants during dedifferentiation (5 weeks)",
  },
  {
    code: "C1",
    sTag: "S05",
    img: "5.jpg",
    title: "C1",
    desc: "Compact primary callus obtained 3 months after induction",
  },
  {
    code: "C2",
    sTag: "S06",
    img: "6.jpg",
    title: "C2",
    desc: "Embryogenic callus obtained 7 months after induction",
  },
  {
    code: "C3",
    sTag: "S07",
    img: "7.jpg",
    title: "C3",
    desc: "Established cell clusters obtained after 4 months in liquid proliferation medium",
  },
  {
    code: "R1",
    sTag: "S08",
    img: "8.jpg",
    title: "R1",
    desc: "Pro-embryogenic masses (1 week in redifferentiation medium after auxin withdrawal)",
  },
  {
    code: "R2",
    sTag: "S09",
    img: "9.jpg",
    title: "R2",
    desc: "24 h in redifferentiation medium after reducing cell density",
  },
  {
    code: "R3",
    sTag: "S10",
    img: "10.jpg",
    title: "R3",
    desc: "72 h in redifferentiation medium after reducing cell density",
  },
  {
    code: "R4",
    sTag: "S11",
    img: "11.jpg",
    title: "R4",
    desc: "10 days in redifferentiation medium",
  },
  {
    code: "E1",
    sTag: "S12",
    img: "12.jpg",
    title: "E1",
    desc: "Globular embryos obtained after 3 weeks of culture",
  },
];

// ============================================================
// 2. COLOR SCALE (identical to R Shiny)
// ============================================================
const COLOR_STOPS = [
  [0.0, 0, 0, 139],
  [0.15, 20, 80, 210],
  [0.32, 0, 170, 200],
  [0.48, 160, 220, 240],
  [0.6, 255, 240, 110],
  [0.75, 255, 165, 30],
  [0.88, 220, 60, 10],
  [1.0, 200, 0, 0],
];

function interpColor(t) {
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 1; i < COLOR_STOPS.length; i++) {
    const [t0, r0, g0, b0] = COLOR_STOPS[i - 1];
    const [t1, r1, g1, b1] = COLOR_STOPS[i];
    if (clamped <= t1) {
      const f = (clamped - t0) / (t1 - t0);
      const r = Math.round(r0 + f * (r1 - r0));
      const g = Math.round(g0 + f * (g1 - g0));
      const b = Math.round(b0 + f * (b1 - b0));
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  return "rgb(200, 0, 0)";
}

// ============================================================
// 3. LEGEND
// ============================================================
function Legend() {
  const steps = 60;
  const colors = Array.from({ length: steps }, (_, i) =>
    interpColor(i / (steps - 1)),
  );
  return (
    <div style={{ maxWidth: "300px", marginTop: "8px" }}>
      <div
        style={{
          display: "flex",
          height: "12px",
          borderRadius: "20px",
          overflow: "hidden",
        }}
      >
        {colors.map((c, i) => (
          <div key={i} style={{ flex: 1, background: c }} />
        ))}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "12px",
          color: "#555",
          marginTop: "2px",
        }}
      >
        <span>Low</span>
        <span>High</span>
      </div>
    </div>
  );
}

// ============================================================
// 4. MAIN COMPONENT – hover‑only (no click preview)
// ============================================================
export function ExpressionProfile({ expressionRows }) {
  const [hovered, setHovered] = useState(null); // only hover state

  // Build map: stageTag -> array of expression values
  const stageData = useMemo(() => {
    const map = {};
    STAGES.forEach((s) => (map[s.sTag] = []));
    expressionRows.forEach((row) => {
      if (map[row.stage_tag] !== undefined) {
        map[row.stage_tag].push(row.expression);
      } else {
        console.warn(
          `[ExpressionProfile] Unknown stage_tag: "${row.stage_tag}"`,
        );
      }
    });
    Object.keys(map).forEach((key) => map[key].sort((a, b) => a - b));
    return map;
  }, [expressionRows]);

  // Compute means and global min/max
  const { means, globalMin, globalMax, hasData } = useMemo(() => {
    const meansMap = {};
    let gMin = Infinity;
    let gMax = -Infinity;
    STAGES.forEach((s) => {
      const vals = stageData[s.sTag] || [];
      if (vals.length) {
        const m = vals.reduce((a, b) => a + b, 0) / vals.length;
        meansMap[s.sTag] = m;
        if (m < gMin) gMin = m;
        if (m > gMax) gMax = m;
      } else {
        meansMap[s.sTag] = null;
      }
    });
    const hasAny = Object.values(meansMap).some((v) => v !== null);
    if (!hasAny || gMax === gMin) {
      return { means: meansMap, globalMin: 0, globalMax: 1, hasData: false };
    }
    return { means: meansMap, globalMin: gMin, globalMax: gMax, hasData: true };
  }, [stageData]);

  if (!hasData) {
    return (
      <div style={styles.section}>
        <div style={styles.header}>
          <h2 style={styles.title}>Expression Profile</h2>
          <span style={styles.badge}>No data</span>
        </div>
        <div style={styles.empty}>
          No expression data available for this gene.
        </div>
      </div>
    );
  }

  const range = globalMax - globalMin || 1;

  // Helper to get expression level
  const getLevel = (sTag) => {
    const mean = means[sTag];
    if (mean === null) return "No data";
    const t = (mean - globalMin) / range;
    if (t < 0.33) return "Low";
    if (t < 0.66) return "Medium";
    return "High";
  };

  return (
    <div style={styles.section}>
      <div style={styles.header}>
        <h2 style={styles.title}>Expression Profile</h2>
        <span style={styles.badge}>
          {STAGES.length} Somatic embryo developmental stages
        </span>
      </div>

      {/* Card Grid – only hover */}
      <div style={styles.grid}>
        {STAGES.map((stage, index) => {
          const vals = stageData[stage.sTag] || [];
          const mean = means[stage.sTag];
          const hasVals = vals.length > 0 && mean !== null;

          let barPercent = 0;
          let color = "#e0d8c8";
          let level = "No data";

          if (hasVals) {
            const t = (mean - globalMin) / range;
            barPercent = Math.max(0, Math.min(100, t * 100));
            color = interpColor(t);
            level = getLevel(stage.sTag);
          }

          const isHovered = hovered === stage.sTag;

          // icon background from expression
          const iconBg = hasVals ? color : "#d0c8c0";
          const iconTextColor = hasVals ? "#ffffff" : "#2c241c";

          return (
            <div
              key={stage.sTag}
              style={{
                ...styles.card,
                ...(isHovered && hasVals ? styles.cardHover : {}),
              }}
              onMouseEnter={() => setHovered(stage.sTag)}
              onMouseLeave={() =>
                setHovered((h) => (h === stage.sTag ? null : h))
              }
            >
              {/* Icon circle */}
              <div
                style={{
                  ...styles.icon,
                  background: iconBg,
                }}
              >
                <span
                  style={{
                    ...styles.iconText,
                    color: iconTextColor,
                  }}
                >
                  {stage.code}
                </span>
              </div>

              {/* Bar and value */}
              <div style={styles.barRow}>
                <div style={styles.barBg}>
                  <div
                    style={{
                      width: `${barPercent}%`,
                      background: color,
                      height: "100%",
                      borderRadius: "20px",
                      transition: "width 0.5s ease",
                    }}
                  />
                </div>
                {hasVals && (
                  <span style={styles.barMean}>{mean.toFixed(2)}</span>
                )}
              </div>

              {/* Tooltip on hover (only if data exists) */}
              {isHovered && hasVals && (
                <div style={styles.tooltip}>
                  <div style={styles.tooltipTitle}>{stage.title}</div>
                  <div style={styles.tooltipDesc}>{stage.desc}</div>
                  <div style={styles.tooltipLevel}>
                    Expression: <strong>{level}</strong>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={styles.legendWrap}>
        <div style={styles.legendTitle}>Expression level</div>
        <Legend />
      </div>
    </div>
  );
}

// ============================================================
// 5. STYLES
// ============================================================
const styles = {
  section: {
    background: "#fff",
    border: "1px solid #e0d8d0",
    borderRadius: "16px",
    padding: "24px 28px",
    marginBottom: "32px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "20px",
  },
  title: {
    fontFamily: "var(--font-display)",
    fontSize: "22px",
    fontWeight: 500,
    color: "#1a1a1a",
    margin: 0,
    letterSpacing: "-0.01em",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  badge: {
    fontFamily: "monospace",
    fontSize: "11px",
    background: "rgba(0,0,0,0.06)",
    padding: "4px 14px",
    borderRadius: "20px",
    color: "#666",
  },
  empty: {
    padding: "30px",
    textAlign: "center",
    color: "#999",
    fontStyle: "italic",
    border: "1px dashed #ccc",
    borderRadius: "8px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "12px",
  },
  card: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 14px",
    background: "#faf8f6",
    borderRadius: "10px",
    border: "1px solid #eee8e0",
    boxShadow: "none",
    transform: "none",
    transition: "all 0.2s ease",
    position: "relative",
    cursor: "default", // removed pointer, no click action
  },
  cardHover: {
    border: "1px solid #c8a97e",
    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
    transform: "translateY(-2px)",
  },
  icon: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontWeight: "600",
    fontSize: "12px",
    fontFamily: "monospace",
  },
  iconText: {
    lineHeight: 1,
  },
  barRow: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  barBg: {
    flex: 1,
    height: "8px",
    background: "#e8e1d0",
    borderRadius: "20px",
    overflow: "hidden",
  },
  barMean: {
    fontFamily: "monospace",
    fontSize: "12px",
    minWidth: "40px",
    textAlign: "right",
    color: "#555",
  },
  tooltip: {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    bottom: "calc(100% + 10px)",
    background: "#1e1a16",
    color: "#f0e6d0",
    padding: "10px 14px",
    borderRadius: "6px",
    fontSize: "12px",
    lineHeight: "1.5",
    whiteSpace: "nowrap",
    boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
    pointerEvents: "none",
    zIndex: 100,
    minWidth: "180px",
  },
  tooltipTitle: {
    fontWeight: "600",
    color: "#e8c890",
    fontSize: "13px",
    marginBottom: "2px",
  },
  tooltipDesc: {
    color: "#c0b8a8",
    fontSize: "11px",
    marginBottom: "4px",
  },
  tooltipLevel: {
    fontSize: "12px",
    color: "#d4c4a4",
  },
  legendWrap: {
    marginTop: "24px",
    paddingTop: "16px",
    borderTop: "1px solid #e0d8d0",
  },
  legendTitle: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#1a1a1a",
    marginBottom: "6px",
  },
};
