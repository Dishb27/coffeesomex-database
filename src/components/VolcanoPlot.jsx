"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";

const PADDING = { top: 24, right: 24, bottom: 56, left: 64 };
const POINT_RADIUS = 2.4;
const HOVER_RADIUS = 6;
const TOOLTIP_WIDTH = 170;

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
  const [isTouch, setIsTouch] = useState(false);

  const [padjCutoff] = useState(defaultPadjCutoff);
  const [log2fcCutoff] = useState(defaultLog2fcCutoff);

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
          y: Math.min(-Math.log10(padj), 300),
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

  // Resize observer — clamps to the wrapper's own width so the canvas never
  // exceeds its container (avoids triggering horizontal page scroll on mobile).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      setSize({ width: Math.max(280, w), height: Math.max(260, w * 0.62) });
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
      if (!isSig) return "rgba(156, 143, 120, 0.35)";
      return p.regulation === "Upregulated" ? "#4f7a52" : "#b5603c";
    },
    [padjCutoff, log2fcCutoff],
  );

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

    // Fill background so the exported PNG isn't transparent
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size.width, size.height);

    ctx.strokeStyle = "#e6dcc8";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PADDING.left, PADDING.top);
    ctx.lineTo(PADDING.left, size.height - PADDING.bottom);
    ctx.lineTo(size.width - PADDING.right, size.height - PADDING.bottom);
    ctx.stroke();

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

    plotPoints.forEach((p) => {
      const px = xScale(p.x);
      const py = yScale(p.y);
      ctx.beginPath();
      ctx.fillStyle = colorFor(p);
      ctx.arc(px, py, POINT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    });

    if (hover) {
      const px = xScale(hover.point.x);
      const py = yScale(hover.point.y);
      ctx.beginPath();
      ctx.strokeStyle = "#3a3226";
      ctx.lineWidth = 1.5;
      ctx.arc(px, py, HOVER_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
    }

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

    ctx.textAlign = "center";
    ctx.font = '10px "IBM Plex Mono", monospace';
    const xTicks = size.width < 420 ? 3 : 5;
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

  const findNearest = useCallback(
    (clientX, clientY) => {
      const rect = canvasRef.current.getBoundingClientRect();
      const mx = clientX - rect.left;
      const my = clientY - rect.top;
      let nearest = null;
      let nearestDist = 14;
      for (const p of plotPoints) {
        const px = xScale(p.x);
        const py = yScale(p.y);
        const dist = Math.hypot(px - mx, py - my);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = p;
        }
      }
      return nearest;
    },
    [plotPoints, xScale, yScale],
  );

  const handleMouseMove = useCallback(
    (e) => {
      const nearest = findNearest(e.clientX, e.clientY);
      setHover(
        nearest
          ? { point: nearest, screenX: e.clientX, screenY: e.clientY }
          : null,
      );
    },
    [findNearest],
  );

  const handleClick = useCallback(() => {
    if (hover?.point?.gene_id) {
      router.push(`/gene/${hover.point.gene_id}`);
    }
  }, [hover, router]);

  // Touch support: first tap inspects the nearest point, tapping again on
  // an already-selected point navigates to the gene page.
  const handleTouchStart = useCallback(
    (e) => {
      setIsTouch(true);
      const touch = e.touches[0];
      if (!touch) return;
      const nearest = findNearest(touch.clientX, touch.clientY);
      if (nearest && hover?.point?.gene_id === nearest.gene_id) {
        router.push(`/gene/${nearest.gene_id}`);
        return;
      }
      setHover(
        nearest
          ? { point: nearest, screenX: touch.clientX, screenY: touch.clientY }
          : null,
      );
    },
    [findNearest, hover, router],
  );

  function handleDownloadPNG() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    const safeName = (comparisonLabel || "volcano-plot").replace(/\s+/g, "_");
    link.download = `${safeName}_volcano.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  // Clamp tooltip so it never renders off-screen (important on narrow phones)
  const tooltipStyle = useMemo(() => {
    if (!hover || !wrapRef.current) return null;
    const wrapRect = wrapRef.current.getBoundingClientRect();
    let left = hover.screenX - wrapRect.left + 12;
    let top = hover.screenY - wrapRect.top - 8;
    if (left + TOOLTIP_WIDTH > wrapRect.width) {
      left = hover.screenX - wrapRect.left - TOOLTIP_WIDTH - 12;
    }
    if (left < 0) left = 4;
    if (top < 0) top = 4;
    return { left, top };
  }, [hover]);

  return (
    <div className="volcano-wrap" ref={wrapRef}>
      <div className="volcano-header">
        <h3>Volcano plot{comparisonLabel ? ` — ${comparisonLabel}` : ""}</h3>
        <div className="volcano-header-actions">
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
          <button
            type="button"
            className="volcano-download-btn"
            onClick={handleDownloadPNG}
            title="Download plot as PNG"
          >
            ⬇ PNG
          </button>
        </div>
      </div>

      <div className="volcano-canvas-wrap">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => !isTouch && setHover(null)}
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          style={{ cursor: hover ? "pointer" : "crosshair" }}
        />

        {hover && tooltipStyle && (
          <div
            className="volcano-tooltip"
            style={{ left: tooltipStyle.left, top: tooltipStyle.top }}
          >
            <div className="volcano-tooltip-gene">{hover.point.gene_id}</div>
            <div className="volcano-tooltip-row">
              log₂FC: <strong>{hover.point.log2FoldChange.toFixed(2)}</strong>
            </div>
            <div className="volcano-tooltip-row">
              padj: <strong>{hover.point.padj.toExponential(2)}</strong>
            </div>
            <div className="volcano-tooltip-hint">
              {isTouch ? "Tap again to view gene →" : "Click to view gene →"}
            </div>
          </div>
        )}
      </div>

      <p className="volcano-caption">
        Showing {plotPoints.length.toLocaleString()} genes.
      </p>
    </div>
  );
}
