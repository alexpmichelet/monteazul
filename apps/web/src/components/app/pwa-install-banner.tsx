"use client";

import * as React from "react";
import Image from "next/image";
import { Share, X } from "lucide-react";

/** Snooze after a dismissal — the banner must invite, not nag. */
const DISMISS_KEY = "monteazul-install-dismissed-at";
const DISMISS_DAYS = 14;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  // iPadOS ships a macOS user agent — the touch points give it away.
  return (
    /iPhone|iPad|iPod/i.test(ua) ||
    (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
  );
}

function recentlyDismissed(): boolean {
  try {
    const at = Number(window.localStorage.getItem(DISMISS_KEY) ?? 0);
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/**
 * PWA bootstrap of the public directory: registers the offline service worker
 * and shows the « add to home screen » invitation banner.
 *
 * - Android/Chrome fires `beforeinstallprompt`: we hold the event and the
 *   banner's «Instalar» button triggers the REAL native install prompt.
 * - iOS Safari has no install event: the banner explains the manual gesture
 *   (Compartir → «Añadir a pantalla de inicio»).
 * - Never shown inside the installed app (standalone) and snoozed for 14 days
 *   after a dismissal.
 */
export function PwaInstallBanner() {
  const [mode, setMode] = React.useState<"hidden" | "android" | "ios">("hidden");
  const deferredPrompt = React.useRef<BeforeInstallPromptEvent | null>(null);

  React.useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline fallback unavailable — the live site works regardless.
      });
    }

    if (isStandalone() || recentlyDismissed()) return;

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      deferredPrompt.current = event as BeforeInstallPromptEvent;
      setMode("android");
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    if (isIos()) setMode("ios");

    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  if (mode === "hidden") return null;

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Storage unavailable — the banner simply reappears next visit.
    }
    setMode("hidden");
  }

  async function install() {
    const prompt = deferredPrompt.current;
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") setMode("hidden");
    else dismiss();
  }

  return (
    <div
      role="dialog"
      aria-label="Instalar la aplicación"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-[440px] rounded-2xl bg-[#1F3149] p-3.5 text-[#ECE9E0] shadow-[0_8px_30px_rgba(20,30,50,0.45)]"
    >
      <div className="flex items-center gap-3">
        <Image
          src="/icons/icon-192.png"
          alt=""
          width={44}
          height={44}
          className="shrink-0 rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold leading-tight">
            Instala Directorio Monteazul
          </p>
          {mode === "android" ? (
            <p className="mt-0.5 text-[12.5px] leading-snug opacity-85">
              Añádelo a tu pantalla de inicio para abrirlo como una app.
            </p>
          ) : (
            <p className="mt-0.5 text-[12.5px] leading-snug opacity-85">
              Toca <Share aria-label="Compartir" className="inline size-3.5 align-[-2px]" />{" "}
              Compartir y luego «Añadir a pantalla de inicio».
            </p>
          )}
        </div>
        {mode === "android" ? (
          <button
            type="button"
            onClick={() => void install()}
            className="shrink-0 rounded-xl bg-[#ECE9E0] px-4 py-2 text-[13px] font-bold text-[#1F3149]"
          >
            Instalar
          </button>
        ) : null}
        <button
          type="button"
          aria-label="Cerrar"
          onClick={dismiss}
          className="shrink-0 rounded-full p-1.5 opacity-70"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
