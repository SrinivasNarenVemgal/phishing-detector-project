import { describe, it, expect } from "vitest";
import { checkRateLimit } from "../lib/rateLimit.js";

describe("checkRateLimit", () => {
  it("allows requests up to the limit", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      const result = checkRateLimit(key, 3, 60_000);
      expect(result.allowed).toBe(true);
    }
  });

  it("blocks requests beyond the limit within the window", () => {
    const key = `test-${Math.random()}`;
    checkRateLimit(key, 2, 60_000);
    checkRateLimit(key, 2, 60_000);
    const third = checkRateLimit(key, 2, 60_000);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks separate keys independently", () => {
    const keyA = `test-a-${Math.random()}`;
    const keyB = `test-b-${Math.random()}`;
    checkRateLimit(keyA, 1, 60_000);
    const resultB = checkRateLimit(keyB, 1, 60_000);
    expect(resultB.allowed).toBe(true);
  });
});
