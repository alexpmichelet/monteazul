import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import manifest from "./manifest";

describe("PWA manifest", () => {
  const data = manifest();

  it("declares an installable standalone Spanish app", () => {
    expect(data.name).toBe("Directorio Monteazul");
    expect(data.short_name).toBe("Monteazul");
    expect(data.display).toBe("standalone");
    expect(data.start_url).toBe("/");
    expect(data.lang).toBe("es");
  });

  it("ships every icon it references (any + maskable pairs)", () => {
    const icons = data.icons ?? [];
    expect(icons).toHaveLength(4);
    expect(icons.filter((i) => i.purpose === "maskable")).toHaveLength(2);
    const publicDir = path.resolve(process.cwd(), "public");
    for (const icon of icons) {
      expect(existsSync(path.join(publicDir, icon.src))).toBe(true);
    }
  });

  it("ships the offline fallback and the service worker the banner registers", () => {
    const publicDir = path.resolve(process.cwd(), "public");
    expect(existsSync(path.join(publicDir, "offline.html"))).toBe(true);
    expect(existsSync(path.join(publicDir, "sw.js"))).toBe(true);
  });
});
