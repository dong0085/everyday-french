"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Header({ signedIn, admin }: { signedIn: boolean; admin: boolean }) {
  const path = usePathname();
  const current = (href: string) => (href === "/" ? path === "/" : path.startsWith(href)) ? "page" : undefined;
  return (
    <header className="app-header">
      <div className="inner">
        <Link href="/" className="brand">
          Everyday <span>French</span>
        </Link>
        {signedIn && (
          <nav className="nav" aria-label="Main">
            <Link href="/" aria-current={current("/")}>Topics</Link>
            <Link href="/review" aria-current={current("/review")}>Review</Link>
            <Link href="/settings" aria-current={current("/settings")}>Settings</Link>
            {admin && (
              <Link href="/admin" aria-current={current("/admin")}>
                Admin
              </Link>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
