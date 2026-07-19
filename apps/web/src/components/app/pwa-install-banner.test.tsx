import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PwaInstallBanner } from "./pwa-install-banner";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

function setUserAgent(value: string) {
  Object.defineProperty(window.navigator, "userAgent", {
    value,
    configurable: true,
  });
}

function setStandalone(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: query.includes("standalone") ? matches : false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
}

const IOS_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36";

describe("PwaInstallBanner", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setStandalone(false);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the manual instructions on iOS Safari (no install event there)", () => {
    setUserAgent(IOS_UA);
    render(<PwaInstallBanner />);
    expect(screen.getByText("Instala Directorio Monteazul")).toBeTruthy();
    expect(
      screen.getByText(/«Añadir a pantalla de inicio»/),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Instalar" })).toBeNull();
  });

  it("never shows inside the installed app (standalone)", () => {
    setUserAgent(IOS_UA);
    setStandalone(true);
    render(<PwaInstallBanner />);
    expect(screen.queryByText("Instala Directorio Monteazul")).toBeNull();
  });

  it("dismissing snoozes the banner for the next visits", async () => {
    const user = userEvent.setup();
    setUserAgent(IOS_UA);
    const first = render(<PwaInstallBanner />);
    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByText("Instala Directorio Monteazul")).toBeNull();
    first.unmount();

    // A fresh mount within the snooze window stays quiet.
    render(<PwaInstallBanner />);
    expect(screen.queryByText("Instala Directorio Monteazul")).toBeNull();
  });

  it("on Android, beforeinstallprompt reveals the banner and «Instalar» triggers the native prompt", async () => {
    const user = userEvent.setup();
    setUserAgent(ANDROID_UA);
    render(<PwaInstallBanner />);
    expect(screen.queryByText("Instala Directorio Monteazul")).toBeNull();

    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = new Event("beforeinstallprompt") as Event & {
      prompt: typeof prompt;
      userChoice: Promise<{ outcome: "accepted" }>;
    };
    event.prompt = prompt;
    event.userChoice = Promise.resolve({ outcome: "accepted" });
    fireEvent(window, event);

    const install = await screen.findByRole("button", { name: "Instalar" });
    await user.click(install);
    expect(prompt).toHaveBeenCalledTimes(1);
  });
});
