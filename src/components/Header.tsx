"use client";
// App header (brand; on wide screens the main nav + "New topic") and, on phones, the bottom tab bar.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";
import { RegisterSW } from "./RegisterSW";

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Topics", icon: "home" },
  { href: "/review", label: "Review", icon: "cards" },
  { href: "/words", label: "Words", icon: "book" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

function isCurrent(path: string, href: string) {
  if (href === "/") return path === "/" || path.startsWith("/topics/");
  return path === href || path.startsWith(href + "/");
}

/** `admin` is accepted for the layout's sake; the Admin link lives in Settings now. */
export function Header({ signedIn }: { signedIn: boolean; admin?: boolean }) {
  const path = usePathname();
  const current = (href: string) => (isCurrent(path, href) ? "page" : undefined);
  return (
    <>
      <header className="app-header">
        <div className="inner">
          <Link href="/" className="brand">
            <span className="brand-dot" aria-hidden="true" />
            Everyday <span>French</span>
          </Link>
          {signedIn && (
            <nav className="nav" aria-label="Main">
              {TABS.map((t) => (
                <Link key={t.href} href={t.href} aria-current={current(t.href)}>
                  {t.label}
                </Link>
              ))}
              <Link href="/new" className="nav-new" aria-current={current("/new")}>
                <Icon name="plus" size={18} /> New topic
              </Link>
            </nav>
          )}
        </div>
      </header>
      {signedIn && <TabBar path={path} />}
      <RegisterSW />
    </>
  );
}

/** Phones only (CSS): Topics · Review · + · Words · Settings, at the bottom where thumbs are. */
function TabBar({ path }: { path: string }) {
  const tab = (t: (typeof TABS)[number]) => (
    <Link key={t.href} href={t.href} className="tab" aria-current={isCurrent(path, t.href) ? "page" : undefined}>
      <Icon name={t.icon} size={22} />
      <span>{t.label}</span>
    </Link>
  );
  return (
    <nav className="tabbar" aria-label="Main (bottom)">
      {tab(TABS[0])}
      {tab(TABS[1])}
      <Link href="/new" className="tab tab-new" aria-current={isCurrent(path, "/new") ? "page" : undefined}>
        <span className="tab-new-circle">
          <Icon name="plus" size={26} />
        </span>
        <span>New</span>
      </Link>
      {tab(TABS[2])}
      {tab(TABS[3])}
    </nav>
  );
}
