import type { MetadataRoute } from "next";

/**
 * PWA manifest of the public directory (Next serves it at
 * /manifest.webmanifest and links it automatically). `display: standalone`
 * opens the installed app without browser chrome on Android AND iOS; the
 * maskable pair keeps the pin inside every launcher mask's safe zone. The
 * background colour is the logo's own navy, so the Android splash (background
 * + icon) reads as one full-bleed brand screen.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Directorio Monteazul",
    short_name: "Monteazul",
    description:
      "Directorio de negocios de la comunidad Monteazul: descubre y contacta a los emprendedores de tu comunidad.",
    lang: "es",
    start_url: "/",
    display: "standalone",
    background_color: "#1F3149",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
