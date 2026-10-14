import type { Metadata, Viewport } from "next";
import { getUserId } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { Toaster } from "@/components/ui";
import "./globals.css";

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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const userId = await getUserId().catch(() => null);
  return (
    <html lang="en">
      <body>
        <Header signedIn={Boolean(userId)} />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
