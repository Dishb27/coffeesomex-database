"use client";

import Link from "next/link";
import { CoffeeDBLogo } from "@/components/CoffeeDBLogo";

export default function SiteHeader({ pageTitle }) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-logo-link" aria-label="Go to homepage">
          <CoffeeDBLogo />
        </Link>
        {pageTitle && <span className="site-page-title">{pageTitle}</span>}
      </div>
    </header>
  );
}
