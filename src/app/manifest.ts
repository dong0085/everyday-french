import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Everyday French",
    short_name: "French",
    description: "French words, sentences and audio from things that happened to you.",
    start_url: "/",
    scope: "/",
    lang: "en",
    dir: "ltr",
    categories: ["education"],
    display: "standalone",
    background_color: "#faf8f4",
    theme_color: "#faf8f4",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "New topic", short_name: "New", url: "/new", icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Review", short_name: "Review", url: "/review", icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }] },
    ],
  };
}
