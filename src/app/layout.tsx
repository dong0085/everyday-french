import type { Metadata, Viewport } from "next";
import { Literata } from "next/font/google";
import { headers } from "next/headers";
import Link from "next/link";
import { getUserId } from "@/lib/supabase/server";
import { getAdmin } from "@/lib/admin";
import { Header } from "@/components/Header";
import { Toaster } from "@/components/ui";
import "./globals.css";
import "./styles/home.css";
import "./styles/topic.css";
import "./styles/review.css";
import "./styles/settings.css";
import "./styles/sounds.css";

// Self-hosted at build time (no request to Google from the browser). Serif for French text, titles and IPA.
// "vietnamese" brings the combining tilde (ɑ̃ ɔ̃ ɛ̃); browsers download each subset only when a page uses it.
const literata = Literata({ subsets: ["latin", "latin-ext", "vietnamese"], style: ["normal", "italic"], variable: "--font-literata", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Everyday French", template: "%s · Everyday French" },
  description: "Turn what just happened to you into French words, sentences and audio you can study anywhere.",
  applicationName: "Everyday French",
  appleWebApp: { capable: true, title: "Everyday French", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f4" },
    { media: "(prefers-color-scheme: dark)", color: "#161514" },
  ],
};

// Applies the saved Appearance choice (Settings) before first paint, so there is no flash.
// A fixed string written here, never user or AI text, so inlining it is safe.
const THEME_SCRIPT = `try{var t=localStorage.getItem("ef.theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [userId, admin, nonce] = await Promise.all([
    getUserId().catch(() => null),
    getAdmin().catch(() => null),
    headers().then((h) => h.get("x-nonce") ?? undefined),
  ]);
  return (
    <html lang="en" className={literata.variable} suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <Header signedIn={Boolean(userId)} admin={Boolean(admin)} />
        <div id="main">{children}</div>
        <footer className="app-footer">
          <span>Everyday French</span>
          <Link href="/privacy">Privacy</Link>
          <Link href="/sounds">French sounds</Link>
        </footer>
        <Toaster />
      </body>
    </html>
  );
}
