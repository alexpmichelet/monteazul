import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "@/providers/convex-client-provider";
import { FavoritesProvider } from "@/components/directory/favorites-context";
import { SiteVisitTracker } from "@/components/app/site-visit-tracker";
import { PwaInstallBanner } from "@/components/app/pwa-install-banner";
import { DOM_RESILIENCE_SCRIPT } from "@packages/shared/dom-resilience";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Directorio Monteazul",
  description:
    "Directorio de negocios de la comunidad Monteazul: descubre y contacta a los emprendedores de tu comunidad.",
  // iOS « Añadir a pantalla de inicio »: standalone app window, own title.
  // (The manifest — app/manifest.ts — covers Android; apple-icon.png is
  // auto-linked as the apple-touch-icon by the file convention.)
  appleWebApp: {
    capable: true,
    title: "Monteazul",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConvexAuthNextjsServerProvider>
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Must run before hydration — see @packages/shared/dom-resilience. */}
        <script dangerouslySetInnerHTML={{ __html: DOM_RESILIENCE_SCRIPT }} />
        <ConvexClientProvider>
          {/* One Ingreso per device per Bogota day, whatever the entry page. */}
          <SiteVisitTracker />
          <FavoritesProvider>{children}</FavoritesProvider>
          {/* Offline service worker + « add to home screen » invitation. */}
          <PwaInstallBanner />
        </ConvexClientProvider>
      </body>
    </html>
    </ConvexAuthNextjsServerProvider>
  );
}
