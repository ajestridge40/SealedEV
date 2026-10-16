import type { MetadataRoute } from "next";

/** Web app manifest: lets phones install SealedEV as a full-screen app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SealedEV — sealed TCG value finder",
    short_name: "SealedEV",
    description: "Expected value of opening sealed trading card products vs. their market price.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    categories: ["finance", "shopping", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Watchlist", url: "/watchlist" },
      { name: "My Collection", url: "/collection" },
      { name: "Alerts", url: "/notifications" },
    ],
  };
}
