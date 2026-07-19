"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";

const PADDING = { top: 24, right: 24, bottom: 56, left: 64 };
const POINT_RADIUS = 2.4;
const HOVER_RADIUS = 6;

function scaleLinear(domain, range) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const scale = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return (v) => r0 + (v - d0) * scale;
}

export function VolcanoPlot({
  points,
  comparisonLabel,
  defaultPadjCutoff = 0.05,
  defaultLog2fcCutoff = 1,
}) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const router = useRouter();
  const [size, setSize] = useState({ width: 720, height: 460 });
  const [hover, setHover] = useState(null); // { point, screenX, screenY }

  // Thresholds are editable in the UI -- until you confirm the exact values
  // your DESeq2/edgeR pipeline used, these defaults are just a starting point.
  const [padjCutoff, setPadjCutoff] = useState(defaultPadjCutoff);
  const [log2fcCutoff, setLog2fcCutoff] = useState(defaultLog2fcCutoff);
  const [padjInput, setPadjInput] = useState(String(defaultPadjCutoff));
  const [log2fcInput, setLog2fcInput] = useState(String(defaultLog2fcCutoff));

  function applyThresholds() {
    const p = parseFloat(padjInput);
    const f = parseFloat(log2fcInput);
    if (!Number.isNaN(p) && p > 0 && p <= 1) setPadjCutoff(p);
    if (!Number.isNaN(f) && f >= 0) setLog2fcCutoff(f);
  }

  // Precompute plot-space coordinates once per dataset
  const plotPoints = useMemo(() => {
    return points
      .map((p) => {
        const padj = Math.max(Number(p.padj) || 1, 1e-300);
        const fc = Number(p.log2FoldChange);
        if (Number.isNaN(fc)) return null;
        return {
          gene_id: p.gene_id,
          regulation: p.regulation,
          log2FoldChange: fc,
          padj,
          x: fc,
          y: Math.min(-Math.log10(padj), 300), // clip extreme -log10 values
        };
      })
      .filter(Boolean);
  }, [points]);

  const xExtent = useMemo(() => {
    if (plotPoints.length === 0) return [-1, 1];
    const xs = plotPoints.map((p) => p.x);
    const maxAbs = Math.max(1, ...xs.map(Math.abs));
    return [-maxAbs * 1.1, maxAbs * 1.1];
  }, [plotPoints]);

  const yExtent = useMemo(() => {
    if (plotPoints.length === 0) return [0, 1];
    const ys = plotPoints.map((p) => p.y);
    return [0, Math.max(...ys) * 1.08];
  }, [plotPoints]);

  // Resize observer so the canvas fills its container responsively
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      setSize({ width: Math.max(320, w), height: Math.max(320, w * 0.58) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const xScale = useMemo(
    () => scaleLinear(xExtent, [PADDING.left, size.width - PADDING.right]),
    [xExtent, size.width],
  );
  const yScale = useMemo(
    () => scaleLinear(yExtent, [size.height - PADDING.bottom, PADDING.top]),
    [yExtent, size.height],
  );

  const colorFor = useCallback(
    (p) => {
      const isSig =
        p.padj < padjCutoff && Math.abs(p.log2FoldChange) >= log2fcCutoff;
      if (!isSig) return "rgba(156, 143, 120, 0.35)"; // muted, not significant
      return p.regulation === "Upregulated" ? "#4f7a52" : "#b5603c"; // sage / copper
    },
    [padjCutoff, log2fcCutoff],
  );

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size.width, size.height);

    // Axes
    ctx.strokeStyle = "#e6dcc8";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PADDING.left, PADDING.top);
    ctx.lineTo(PADDING.left, size.height - PADDING.bottom);
    ctx.lineTo(size.width - PADDING.right, size.height - PADDING.bottom);
    ctx.stroke();

    // Threshold lines (dashed) -- reflect the current, user-editable cutoffs
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "#c9a45c";
    ctx.globalAlpha = 0.6;

    const yThreshold = yScale(-Math.log10(padjCutoff));
    ctx.beginPath();
    ctx.moveTo(PADDING.left, yThreshold);
    ctx.lineTo(size.width - PADDING.right, yThreshold);
    ctx.stroke();

    [-log2fcCutoff, log2fcCutoff].forEach((v) => {
      const xt = xScale(v);
      ctx.beginPath();
      ctx.moveTo(xt, PADDING.top);
      ctx.lineTo(xt, size.height - PADDING.bottom);
      ctx.stroke();
    });
    ctx.restore();

    // Points
    plotPoints.forEach((p) => {
      const px = xScale(p.x);
      const py = yScale(p.y);
      ctx.beginPath();
      ctx.fillStyle = colorFor(p);
      ctx.arc(px, py, POINT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    });

    // Hover highlight
    if (hover) {
      const px = xScale(hover.point.x);
      const py = yScale(hover.point.y);
      ctx.beginPath();
      ctx.strokeStyle = "#3a3226";
      ctx.lineWidth = 1.5;
      ctx.arc(px, py, HOVER_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Axis labels
    ctx.fillStyle = "#6b5f4d";
    ctx.font = '12px "IBM Plex Mono", monospace';
    ctx.textAlign = "center";
    ctx.fillText("log₂ Fold Change", size.width / 2, size.height - 12);

    ctx.save();
    ctx.translate(16, size.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText("-log₁₀(padj)", 0, 0);
    ctx.restore();

    // Tick labels (x)
    ctx.textAlign = "center";
    ctx.font = '10px "IBM Plex Mono", monospace';
    const xTicks = 5;
    for (let i = 0; i <= xTicks; i++) {
      const v = xExtent[0] + ((xExtent[1] - xExtent[0]) * i) / xTicks;
      ctx.fillText(v.toFixed(1), xScale(v), size.height - PADDING.bottom + 16);
    }
  }, [
    plotPoints,
    xScale,
    yScale,
    hover,
    size,
    colorFor,
    xExtent,
    padjCutoff,
    log2fcCutoff,
  ]);

  const handleMouseMove = useCallback(
    (e) => {
      const rect = canvasRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      let nearest = null;
      let nearestDist = 10; // px radius for hit detection

      for (const p of plotPoints) {
        const px = xScale(p.x);
        const py = yScale(p.y);
        const dist = Math.hypot(px - mx, py - my);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = p;
        }
      }

      if (nearest) {
        setHover({ point: nearest, screenX: e.clientX, screenY: e.clientY });
      } else {
        setHover(null);
      }
    },
    [plotPoints, xScale, yScale],
  );

  const handleClick = useCallback(() => {
    if (hover?.point?.gene_id) {
      router.push(`/gene/${hover.point.gene_id}`);
    }
  }, [hover, router]);

  return (
    <div className="volcano-wrap" ref={wrapRef}>
      <div className="volcano-header">
        <h3>Volcano plot{comparisonLabel ? ` — ${comparisonLabel}` : ""}</h3>
        <div className="volcano-legend">
          <span>
            <i className="dot dot-up" /> Upregulated
          </span>
          <span>
            <i className="dot dot-down" /> Downregulated
          </span>
          <span>
            <i className="dot dot-ns" /> Not significant
          </span>
        </div>
      </div>

      {/* Editable thresholds -- update these once you know your pipeline's
          actual cutoffs; the dashed lines and point colors update live. */}
      {/* <div className="volcano-threshold-controls">
        <label>
          padj &lt;
          <input
            type="number"
            step="0.001"
            min="0"
            max="1"
            value={padjInput}
            onChange={(e) => setPadjInput(e.target.value)}
            onBlur={applyThresholds}
            onKeyDown={(e) => e.key === "Enter" && applyThresholds()}
          />
        </label>
        <label>
          |log₂FC| ≥
          <input
            type="number"
            step="0.1"
            min="0"
            value={log2fcInput}
            onChange={(e) => setLog2fcInput(e.target.value)}
            onBlur={applyThresholds}
            onKeyDown={(e) => e.key === "Enter" && applyThresholds()}
          />
        </label>
        <button
          type="button"
          className="volcano-apply-btn"
          onClick={applyThresholds}
        >
          Apply
        </button>
        <span className="volcano-threshold-note">
          (defaults shown — adjust once your actual cutoffs are confirmed)
        </span>
      </div> */}

      <div className="volcano-canvas-wrap">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHover(null)}
          onClick={handleClick}
          style={{ cursor: hover ? "pointer" : "crosshair" }}
        />

        {hover && (
          <div
            className="volcano-tooltip"
            style={{
              left:
                hover.screenX -
                wrapRef.current.getBoundingClientRect().left +
                12,
              top:
                hover.screenY - wrapRef.current.getBoundingClientRect().top - 8,
            }}
          >
            <div className="volcano-tooltip-gene">{hover.point.gene_id}</div>
            <div className="volcano-tooltip-row">
              log₂FC: <strong>{hover.point.log2FoldChange.toFixed(2)}</strong>
            </div>
            <div className="volcano-tooltip-row">
              padj: <strong>{hover.point.padj.toExponential(2)}</strong>
            </div>
            <div className="volcano-tooltip-hint">Click to view gene →</div>
          </div>
        )}
      </div>

      {/* <p className="volcano-caption">
        Dashed lines mark significance thresholds (padj &lt; {padjCutoff},
        |log₂FC| ≥ {log2fcCutoff}). Showing {plotPoints.length.toLocaleString()}{" "}
        genes.
      </p> */}
    </div>
  );
}
