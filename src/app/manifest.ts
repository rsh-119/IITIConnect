import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IITIConnect",
    short_name: "IITIConnect",
    description: "Coordinate campus journeys and city requests.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8f3",
    theme_color: "#125d50",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
