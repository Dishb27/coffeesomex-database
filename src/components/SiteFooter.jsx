"use client";

import { useState } from "react";
import Link from "next/link";
import { CoffeeDBLogo } from "@/components/CoffeeDBLogo";
import { ContactModal } from "@/components/ContactModal";

export default function SiteFooter() {
  const [showContact, setShowContact] = useState(false);

  return (
    <>
      <footer className="footer site-footer">
        <div className="footer-inner">
          <Link href="/" className="footer-logo-link">
            <CoffeeDBLogo />
          </Link>

          <nav className="footer-nav" aria-label="Site sections">
            <Link href="/comparisions" className="footer-nav-link">
              DEG Comparisons
            </Link>
            <Link href="/hubs" className="footer-nav-link">
              Hub Genes
            </Link>
            <Link href="/network" className="footer-nav-link">
              Networks
            </Link>
            <Link href="/tfs" className="footer-nav-link">
              TF Families
            </Link>
          </nav>

          <div className="footer-contact-wrap">
            <button
              className="footer-link footer-contact-btn"
              onClick={() => setShowContact(true)}
            >
              Contact us
            </button>
          </div>
        </div>
        <p className="footer-copy">
          © {new Date().getFullYear()} CoffeeSomEx · For research use
        </p>
      </footer>

      {showContact && <ContactModal onClose={() => setShowContact(false)} />}
    </>
  );
}
