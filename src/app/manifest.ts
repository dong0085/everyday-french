import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Everyday French",
    short_name: "French",
    description: "French words, sentences and audio from things that happened to you.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf8f4",
    theme_color: "#2b4fa8",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "New topic", url: "/new" }],
  };
}
