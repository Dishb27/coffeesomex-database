"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CoffeeDBLogo } from "@/components/CoffeeDBLogo";
import SiteFooter from "@/components/SiteFooter";
import {
  Dna,
  Network,
  GitMerge,
  Search,
  ArrowRight,
  ArrowDown,
  Loader2,
} from "lucide-react";

// ── Reusable hooks & helpers ────────────────────────────────────────────

function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

function AnimatedNumber({ value, duration = 1400 }) {
  const ref = useRef(null);
  const [display, setDisplay] = useState("0");
  const hasAnimated = useRef(false);

  const match = String(value).match(/^([\d,]+)(.*)$/);
  const target = match ? parseInt(match[1].replace(/,/g, ""), 10) : 0;
  const suffix = match ? match[2] : "";

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const start = performance.now();

          const tick = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(eased * target);
            setDisplay(current.toLocaleString());
            if (progress < 1) requestAnimationFrame(tick);
            else setDisplay(target.toLocaleString());
          };
          requestAnimationFrame(tick);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target, duration]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}

function SequenceDivider({ label }) {
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

function ConsoleSequenceBG() {
  const bases = "ATCGGCTACGATTGCACGTAGCTTACGGATCCGATGCATTGCAGCTAGATCGTAGCATCG";
  const strip = bases.repeat(6);
  return (
    <div className="console-seq-bg" aria-hidden="true">
      <div className="console-seq-track">
        <span>{strip}</span>
        <span>{strip}</span>
      </div>
    </div>
  );
}

function VolcanoBG() {
  const pts = [
    [18, 70, "down"],
    [26, 55, "down"],
    [30, 38, "down"],
    [34, 20, "down"],
    [40, 60, "ns"],
    [46, 45, "ns"],
    [50, 30, "ns"],
    [54, 50, "ns"],
    [58, 65, "ns"],
    [63, 20, "up"],
    [68, 35, "up"],
    [72, 48, "up"],
    [76, 18, "up"],
    [80, 60, "up"],
    [84, 30, "up"],
    [22, 25, "down"],
    [45, 15, "ns"],
    [88, 45, "up"],
    [12, 45, "down"],
    [58, 12, "ns"],
  ];
  const colors = { down: "#b5603c", ns: "#c9bfae", up: "#4f7a52" };
  return (
    <svg
      className="network-bg-svg"
      viewBox="0 0 100 80"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {pts.map(([x, y, k], i) => (
        <circle key={i} cx={x} cy={y} r={1.6} fill={colors[k]} opacity={0.55} />
      ))}
      <line
        x1="50"
        y1="0"
        x2="50"
        y2="80"
        stroke="#b8a080"
        strokeWidth="0.3"
        strokeDasharray="2 2"
        opacity="0.5"
      />
      <line
        x1="0"
        y1="55"
        x2="100"
        y2="55"
        stroke="#b8a080"
        strokeWidth="0.3"
        strokeDasharray="2 2"
        opacity="0.5"
      />
    </svg>
  );
}

function NetworkGraphBG({ large = false }) {
  if (!large) {
    const nodes = [
      [50, 40],
      [20, 20],
      [78, 18],
      [15, 55],
      [82, 58],
      [35, 68],
      [65, 70],
      [30, 12],
      [70, 12],
      [50, 74],
    ];
    const edges = [
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
      [0, 5],
      [0, 6],
      [1, 7],
      [2, 8],
      [3, 5],
      [4, 6],
      [5, 9],
      [6, 9],
    ];
    return (
      <svg
        className="network-bg-svg"
        viewBox="0 0 100 80"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        {edges.map(([a, b], i) => (
          <line
            key={i}
            x1={nodes[a][0]}
            y1={nodes[a][1]}
            x2={nodes[b][0]}
            y2={nodes[b][1]}
            stroke="#a8632c"
            strokeWidth="0.4"
            opacity="0.35"
          />
        ))}
        {nodes.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={i === 0 ? 3.4 : 1.8}
            fill={i === 0 ? "#a8632c" : "#c8a97e"}
            opacity={i === 0 ? 0.75 : 0.55}
          />
        ))}
      </svg>
    );
  }

  const hubs = [
    [24, 45],
    [76, 40],
  ];
  const satellites = [
    [8, 20],
    [14, 68],
    [30, 15],
    [36, 72],
    [40, 30],
    [18, 90],
    [60, 18],
    [66, 68],
    [88, 22],
    [92, 62],
    [72, 8],
    [54, 55],
    [46, 10],
    [10, 40],
  ];
  const edges = [
    [0, "s0"],
    [0, "s1"],
    [0, "s2"],
    [0, "s3"],
    [0, "s4"],
    [0, "s5"],
    [0, "s13"],
    [1, "s6"],
    [1, "s7"],
    [1, "s8"],
    [1, "s9"],
    [1, "s10"],
    [1, "s11"],
    [0, 1],
    [0, "s12"],
    [1, "s12"],
  ];
  const point = (id) =>
    typeof id === "number" ? hubs[id] : satellites[parseInt(id.slice(1), 10)];

  return (
    <svg
      className="network-bg-svg"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {edges.map(([a, b], i) => {
        const [x1, y1] = point(a);
        const [x2, y2] = point(b);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#a8632c"
            strokeWidth="0.35"
            opacity="0.3"
          />
        );
      })}
      {satellites.map(([x, y], i) => (
        <circle
          key={`s${i}`}
          cx={x}
          cy={y}
          r={1.6}
          fill="#c8a97e"
          opacity="0.5"
        />
      ))}
      {hubs.map(([x, y], i) => (
        <circle
          key={`h${i}`}
          cx={x}
          cy={y}
          r={4}
          fill="#a8632c"
          opacity="0.7"
        />
      ))}
    </svg>
  );
}

// ── Main Component ──────────────────────────────────────────────────────

export default function GeneSearchPage() {
  const router = useRouter();
  const [geneId, setGeneId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState(null);
  const [exploreTab, setExploreTab] = useState("gene"); // "gene" | "tf"

  const [tfData, setTfData] = useState([]);
  const [familiesLoading, setFamiliesLoading] = useState(true);

  const exploreRef = useReveal();

  useEffect(() => {
    async function fetchFamilies() {
      try {
        const res = await fetch("/api/tf-families");
        if (!res.ok) throw new Error("Failed to fetch families");
        const data = await res.json();
        setTfData(data);
      } catch (err) {
        console.error("Error fetching TF families:", err);
        const fallback = [
          "bHLH",
          "MYB",
          "WRKY",
          "NAC",
          "AP2/ERF",
          "bZIP",
          "MADS",
          "GRAS",
        ].map((f, i) => ({ family: f, gene_count: 150 - i * 10 }));
        setTfData(fallback);
      } finally {
        setFamiliesLoading(false);
      }
    }
    fetchFamilies();
  }, []);

  async function handleSearch(id) {
    const q = (id || geneId).trim();
    if (!q) return;
    setLoading(true);
    setError("");
    router.push(`/gene/${q.toUpperCase()}`);
    setLoading(false);
  }

  function handleExplorerNav(key, path) {
    if (navigatingTo) return;
    setNavigatingTo(key);
    router.push(path);
  }

  const maxCount = tfData.length
    ? Math.max(...tfData.map((f) => f.gene_count))
    : 1;

  return (
    <div className="landing-page">
      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-bg" aria-hidden="true" />
        <div className="hero-overlay" aria-hidden="true" />

        <div className="hero-float hero-float-1" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2v20M2 12h20" />
          </svg>
        </div>
        <div className="hero-float hero-float-2" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div className="hero-float hero-float-3" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        </div>

        <div className="hero-content">
          <div className="hero-eyebrow">
            <span className="hero-dot" aria-hidden="true" />
            <em>Coffea arabica</em>
          </div>

          <h1>
            Coffee<em>SomEx</em>
          </h1>

          <p className="hero-sub">
            CoffeeSomEx is an interactive web resource for exploring the
            molecular landscape of <em>Coffea arabica</em> somatic embryogenesis
            across 12 developmental stages.
            <br />
            <span className="hero-highlight">
              Visualise gene expression, discover hub genes, and explore
              transcription factor families.
            </span>
          </p>

          <button
            type="button"
            className="hero-explore-btn"
            onClick={() => {
              const target = exploreRef.current;
              if (target) {
                const y =
                  target.getBoundingClientRect().top + window.pageYOffset;
                window.scrollTo({ top: y, behavior: "smooth" });
              }
            }}
            aria-label="Explore the platform"
          >
            Explore <ArrowDown size={18} className="btn-arrow" />
          </button>
        </div>
      </section>

      <SequenceDivider label="" />

      {/* ── Explore Genes — tabbed console ── */}
      <section className="explorer-section explore-genes" ref={exploreRef}>
        <div className="explorer-inner">
          <div className="explorer-header">
            <h2>Explore Genes</h2>
            <p>
              Search <em>Coffea arabica</em> genes by ID, or switch modes to
              browse the collection of transcription factor families.
            </p>
          </div>

          <div className="explore-console-card">
            {/* <ConsoleSequenceBG /> */}

            <div className="explore-console-inner">
              {/* Tab switcher */}
              <div
                className="explore-tabs"
                role="tablist"
                aria-label="Gene explorer mode"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={exploreTab === "gene"}
                  className={`explore-tab ${exploreTab === "gene" ? "active" : ""}`}
                  onClick={() => setExploreTab("gene")}
                >
                  <Search size={16} strokeWidth={1.8} />
                  Find a Gene
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={exploreTab === "tf"}
                  className={`explore-tab ${exploreTab === "tf" ? "active" : ""}`}
                  onClick={() => setExploreTab("tf")}
                >
                  <Dna size={16} strokeWidth={1.8} />
                  TF Families
                </button>
                <span
                  className="explore-tab-indicator"
                  style={{
                    transform:
                      exploreTab === "tf"
                        ? "translateX(100%)"
                        : "translateX(0)",
                  }}
                  aria-hidden="true"
                />
              </div>

              {/* Panel content — keyed so it re-mounts (and re-animates) on switch */}
              {exploreTab === "gene" ? (
                <div className="explore-tab-panel" key="gene-panel">
                  <p className="explore-panel-desc">
                    Search by gene ID to access structure, transcripts, and
                    function.
                  </p>

                  <div className="gene-console-compact">
                    <div className="console-input-row">
                      <input
                        type="text"
                        value={geneId}
                        onChange={(e) => {
                          setGeneId(e.target.value);
                          setError("");
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        placeholder="LOC113687214"
                        spellCheck={false}
                        autoComplete="off"
                        aria-label="Gene ID"
                        className="console-input"
                      />
                      <button
                        className="console-submit"
                        onClick={() => handleSearch()}
                        disabled={loading}
                        aria-label="Find gene"
                      >
                        {loading ? (
                          <Loader2
                            size={17}
                            className="explorer-card-spinner"
                          />
                        ) : (
                          <ArrowRight size={17} />
                        )}
                      </button>
                    </div>

                    <div className="console-quick">
                      <span className="console-quick-label">Try:</span>
                      {["LOC113688632", "LOC140004316", "LOC113736396"].map(
                        (id) => (
                          <button
                            key={id}
                            className="hero-chip"
                            onClick={() => {
                              setGeneId(id);
                              handleSearch(id);
                            }}
                          >
                            {id}
                          </button>
                        ),
                      )}
                    </div>

                    {error && (
                      <div className="hero-error" role="alert">
                        No record found for <span>{error}</span>.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="explore-tab-panel" key="tf-panel">
                  <div className="tf-word-cloud">
                    {familiesLoading ? (
                      <span className="cloud-loading">Loading families…</span>
                    ) : (
                      tfData.map(({ family, gene_count }) => {
                        const minSize = 0.75;
                        const maxSize = 1.6;
                        const size =
                          maxCount > 0
                            ? minSize +
                              (gene_count / maxCount) * (maxSize - minSize)
                            : minSize;
                        return (
                          <button
                            key={family}
                            type="button"
                            className="cloud-term"
                            style={{
                              fontSize: `${size}rem`,
                              fontWeight:
                                gene_count > maxCount * 0.7 ? 600 : 400,
                              opacity: 0.55 + (gene_count / maxCount) * 0.45,
                            }}
                            onClick={() =>
                              handleExplorerNav(
                                "tfs",
                                `/tfs?family=${encodeURIComponent(family)}`,
                              )
                            }
                          >
                            {family}
                          </button>
                        );
                      })
                    )}
                  </div>

                  <button
                    type="button"
                    className="explore-tf-cta"
                    onClick={() => handleExplorerNav("tfs", "/tfs")}
                    disabled={navigatingTo === "tfs"}
                  >
                    {navigatingTo === "tfs" ? (
                      <Loader2 size={16} className="explorer-card-spinner" />
                    ) : (
                      <>
                        Browse all families <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <SequenceDivider label="" />

      {/* ── SE Expression Profiles ── */}
      <section className="explorer-section expression-profiles">
        <div className="explorer-inner">
          <div className="explorer-header">
            <h2>SE Expression Profiles</h2>
            <p>
              Explore gene expression dynamics and potential hub genes
              associated with <em>Coffea arabica</em> somatic embryogenesis.
            </p>
          </div>

          <div className="cards-grid">
            <div
              className={`feature-card deg-card ${navigatingTo === "comparisions" ? "is-loading" : ""} ${
                navigatingTo && navigatingTo !== "comparisions"
                  ? "is-disabled"
                  : ""
              }`}
              role="button"
              tabIndex={
                navigatingTo && navigatingTo !== "comparisions" ? -1 : 0
              }
              aria-busy={navigatingTo === "comparisions"}
              onClick={() => handleExplorerNav("comparisions", "/comparisions")}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                handleExplorerNav("comparisions", "/comparisions")
              }
            >
              <VolcanoBG />
              <div className="feature-card-content">
                <div className="feature-card-icon">
                  <GitMerge size={26} strokeWidth={1.5} />
                </div>
                <h3>Explore SE Developmental Stage Comparisons</h3>
                <div className="feature-card-footer">
                  <span className="feature-card-chip">
                    {navigatingTo === "comparisions" ? (
                      <Loader2 size={16} className="explorer-card-spinner" />
                    ) : (
                      "→"
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div
              className={`feature-card hub-card ${navigatingTo === "hubs" ? "is-loading" : ""} ${
                navigatingTo && navigatingTo !== "hubs" ? "is-disabled" : ""
              }`}
              role="button"
              tabIndex={navigatingTo && navigatingTo !== "hubs" ? -1 : 0}
              aria-busy={navigatingTo === "hubs"}
              onClick={() => handleExplorerNav("hubs", "/hubs")}
              onKeyDown={(e) =>
                e.key === "Enter" && handleExplorerNav("hubs", "/hubs")
              }
            >
              <NetworkGraphBG large={false} />
              <div className="feature-card-content">
                <div className="feature-card-icon">
                  <Network size={26} strokeWidth={1.5} />
                </div>
                <h3>Explore Hub Genes</h3>
                <div className="feature-card-footer">
                  <span className="feature-card-chip">
                    {navigatingTo === "hubs" ? (
                      <Loader2 size={16} className="explorer-card-spinner" />
                    ) : (
                      "→"
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div
              className={`feature-card network-card ${navigatingTo === "network" ? "is-loading" : ""} ${
                navigatingTo && navigatingTo !== "network" ? "is-disabled" : ""
              }`}
              role="button"
              tabIndex={navigatingTo && navigatingTo !== "network" ? -1 : 0}
              aria-busy={navigatingTo === "network"}
              onClick={() => handleExplorerNav("network", "/network")}
              onKeyDown={(e) =>
                e.key === "Enter" && handleExplorerNav("network", "/network")
              }
            >
              <NetworkGraphBG large={true} />
              <div className="feature-card-content">
                <div className="feature-card-icon">
                  <Dna size={26} strokeWidth={1.5} />
                </div>
                <h3>Explore Regulatory Networks</h3>
                <div className="feature-card-footer">
                  <span className="feature-card-chip">
                    {navigatingTo === "network" ? (
                      <Loader2 size={16} className="explorer-card-spinner" />
                    ) : (
                      "→"
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SequenceDivider label="" />

      {/* ── Stats ── */}
      <section className="stats-section">
        <div className="stats-inner">
          {[
            { num: "12", label: "SE Developmental stages" },
            { num: "22850", label: "Differentially expressed genes" },
            { num: "23", label: "Co-expression modules" },
            { num: "230", label: "Hub genes" },
          ].map((s, i) => (
            <div
              key={s.label}
              className="stat-item"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="stat-num">
                <AnimatedNumber value={s.num} duration={1200 + i * 150} />
              </div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
