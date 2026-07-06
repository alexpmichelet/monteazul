import { afterEach, describe, expect, it } from "vitest";

import { getVisitorId, VISITOR_ID_STORAGE_KEY } from "./visitor-id";

afterEach(() => {
  window.localStorage.clear();
});

describe("getVisitorId", () => {
  it("returns a non-empty opaque token", () => {
    const id = getVisitorId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("is stable across calls (persisted in localStorage)", () => {
    const first = getVisitorId();
    const second = getVisitorId();
    expect(second).toBe(first);
  });

  it("persists the exact token it returns, and only that (no personal data)", () => {
    const id = getVisitorId();
    expect(window.localStorage.getItem(VISITOR_ID_STORAGE_KEY)).toBe(id);
  });

  it("reuses an already stored token", () => {
    window.localStorage.setItem(VISITOR_ID_STORAGE_KEY, "existing-token");
    expect(getVisitorId()).toBe("existing-token");
  });
});
