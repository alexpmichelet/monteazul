import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "@/providers/convex-client-provider";
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
  title: "Directorio Monteazul — Administración",
  description:
    "Panel de administración del Directorio Monteazul: gestiona los negocios, las aprobaciones y las estadísticas.",
  // Opt out of machine translation: the back-office is already in its users'
  // language, and translators rewrite the DOM behind React's back — crashes
  // at worst, silently stale admin data at best.
  other: { google: "notranslate" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConvexAuthNextjsServerProvider>
    <html lang="es" translate="no">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Must run before hydration — see @packages/shared/dom-resilience. */}
        <script dangerouslySetInnerHTML={{ __html: DOM_RESILIENCE_SCRIPT }} />
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
    </ConvexAuthNextjsServerProvider>
  );
}
