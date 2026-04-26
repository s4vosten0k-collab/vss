import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Памятка водолаза",
    short_name: "Водолаз",
    description: "Водолазно-спасательная памятка с быстрым доступом к разделам",
    start_url: "/handbook?tab=docs",
    display: "standalone",
    background_color: "#0B1220",
    theme_color: "#0B1220",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
