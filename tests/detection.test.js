import { describe, it, expect } from "vitest";
import { analyzeUrl, analyzeEmail } from "../lib/detection.js";

describe("analyzeUrl", () => {
  it("flags a classic brand-impersonation phishing URL as HIGH risk", () => {
    const result = analyzeUrl("http://secure-paypal-login-free.com");
    expect(result.riskLevel).toBe("HIGH");
    expect(result.riskScore).toBeGreaterThanOrEqual(60);
  });

  it("flags a raw IP address URL as HIGH risk", () => {
    const result = analyzeUrl("http://192.168.45.12/login");
    expect(result.riskLevel).toBe("HIGH");
  });

  it("treats a well-known HTTPS domain as LOW risk", () => {
    const result = analyzeUrl("https://www.wikipedia.org");
    expect(result.riskLevel).toBe("LOW");
  });

  it("treats a plain HTTPS domain with no red flags as LOW risk", () => {
    const result = analyzeUrl("https://github.com");
    expect(result.riskLevel).toBe("LOW");
  });

  it("flags known link shorteners", () => {
    const result = analyzeUrl("http://bit.ly/3xyzAB");
    expect(result.reasons.some((r) => r.toLowerCase().includes("shortener"))).toBe(true);
  });

  it("does not crash on a malformed URL and returns HIGH risk", () => {
    const result = analyzeUrl("not a url at all!!");
    expect(result.riskLevel).toBe("HIGH");
    expect(result.riskScore).toBeGreaterThan(0);
  });

  it("accepts extra admin-managed keywords and factors them into scoring", () => {
    const withoutKeyword = analyzeUrl("http://my-crypto-giveaway-site.com");
    const withKeyword = analyzeUrl("http://my-crypto-giveaway-site.com", ["giveaway"]);
    expect(withKeyword.riskScore).toBeGreaterThanOrEqual(withoutKeyword.riskScore);
    expect(withKeyword.reasons.some((r) => r.includes("giveaway"))).toBe(true);
  });
});

describe("analyzeEmail", () => {
  it("flags urgent language + credential requests as HIGH risk", () => {
    const result = analyzeEmail(
      "Your bank account will be suspended. Verify immediately by entering your password and OTP."
    );
    expect(result.riskLevel).toBe("HIGH");
  });

  it("treats an ordinary friendly message as LOW risk", () => {
    const result = analyzeEmail("Hi Sarah, just checking if you're free for coffee on Friday at 4pm. Let me know!");
    expect(result.riskLevel).toBe("LOW");
  });

  it("does not crash on empty-ish content", () => {
    const result = analyzeEmail("ok");
    expect(result.riskLevel).toBe("LOW");
  });

  it("detects a risky embedded link inside email content", () => {
    const result = analyzeEmail("Please click here: http://secure-paypal-login-free.com to verify your account.");
    expect(result.riskScore).toBeGreaterThan(0);
  });
});
