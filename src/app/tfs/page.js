"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./tfs.module.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function TFFamilies() {
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [navigatingFamily, setNavigatingFamily] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchFamilies = async () => {
      try {
        const res = await fetch("/api/tf-families");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setFamilies(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchFamilies();
  }, []);

  const grouped = families.reduce((acc, f) => {
    const letter = f.family.charAt(0).toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(f);
    return acc;
  }, {});

  const categories = Object.keys(grouped).sort();

  const filteredFamilies = families.filter((f) =>
    f.family.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const displayedFamilies =
    activeCategory === "all"
      ? filteredFamilies
      : grouped[activeCategory]?.filter((f) =>
          f.family.toLowerCase().includes(searchTerm.toLowerCase()),
        ) || [];

  const handleFamilyClick = (familyName) => {
    if (navigatingFamily) return;
    setNavigatingFamily(familyName);
    router.push(`/tfs/${encodeURIComponent(familyName)}`);
  };

  const goHome = () => {
    router.push("/");
  };

  if (error) {
    return (
      <div className={styles.errorMessage}>
        <i className="fas fa-exclamation-circle"></i>
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className={styles.appContainer}>
      <SiteHeader pageTitle="TF Family Explorer" />

      <div className={styles.heroSection}>
        {/* <h2>Explore TF Families</h2> */}
        <p className={styles.subtitle}>
          Explore the complete collection of transcription factor families and
          members in <em>Coffea arabica</em>.{" "}
        </p>
      </div>

      {loading ? (
        <div className={styles.familiesContainer}>
          <div className={styles.loadingHeader}>
            <span className={styles.loadingDna} aria-hidden="true">
              <i className="fas fa-dna"></i>
            </span>
            <p className={styles.loadingText}>
              Gathering transcription factor families
              <span className={styles.loadingDots}>
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </span>
            </p>
          </div>

          <div className={styles.familiesGrid}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className={styles.skeletonCard}>
                <div className={styles.skeletonIcon} />
                <div className={styles.skeletonLineLg} />
                <div className={styles.skeletonLineSm} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={`${styles.familiesContainer} ${styles.fadeIn}`}>
          <div className={styles.searchWrapper}>
            <input
              type="text"
              placeholder="Search families…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.categoryTabs}>
            <button
              className={`${styles.categoryTab} ${
                activeCategory === "all" ? styles.activeTab : ""
              }`}
              onClick={() => setActiveCategory("all")}
            >
              All
            </button>
            {categories.map((letter) => (
              <button
                key={letter}
                className={`${styles.categoryTab} ${
                  activeCategory === letter ? styles.activeTab : ""
                }`}
                onClick={() => setActiveCategory(letter)}
              >
                {letter}
              </button>
            ))}
          </div>

          <div className={styles.familiesGrid}>
            {displayedFamilies.map((family, i) => {
              const isLoading = navigatingFamily === family.family;
              const isDisabled =
                navigatingFamily && navigatingFamily !== family.family;
              return (
                <div
                  key={family.family}
                  className={`${styles.familyCard} ${isLoading ? styles.cardLoading : ""} ${isDisabled ? styles.cardDisabled : ""}`}
                  style={{ animationDelay: `${Math.min(i * 25, 300)}ms` }}
                  onClick={() => handleFamilyClick(family.family)}
                  aria-busy={isLoading}
                  aria-disabled={isDisabled}
                >
                  <div className={styles.familyIcon}>
                    {isLoading ? (
                      <i
                        className={`fas fa-circle-notch ${styles.spinIcon}`}
                      ></i>
                    ) : (
                      <i className="fas fa-dna"></i>
                    )}
                  </div>
                  <h3 className={styles.familyName}>{family.family}</h3>
                  <div className={styles.familyMeta}>
                    <span className={styles.geneCount}>
                      {isLoading ? "Opening…" : `${family.gene_count} genes`}
                    </span>
                  </div>
                </div>
              );
            })}
            {displayedFamilies.length === 0 && (
              <div className={styles.noResults}>
                No families match your search.
              </div>
            )}
          </div>
        </div>
      )}
      <SiteFooter />
    </div>
  );
}
