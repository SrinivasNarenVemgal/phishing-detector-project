import { describe, it, expect } from "vitest";
import { predictWithModel } from "../lib/mlModel.js";

describe("predictWithModel (Logistic Regression)", () => {
  it("returns a probability between 0 and 1", () => {
    const result = predictWithModel("https://www.google.com");
    expect(result.probability).toBeGreaterThanOrEqual(0);
    expect(result.probability).toBeLessThanOrEqual(1);
  });

  // Regression test for the HTTPS-feature bug found during development:
  // an earlier model version flagged wikipedia.org as 97% phishing because
  // the training data's "legitimate" URLs were all mislabeled as http-only.
  it("does not flag well-known real domains as high risk (regression test)", () => {
    const knownGood = [
      "https://www.wikipedia.org",
      "https://www.google.com",
      "https://github.com",
      "https://www.amazon.com",
    ];
    for (const url of knownGood) {
      const result = predictWithModel(url);
      expect(result.riskLevel, `${url} should not be HIGH risk`).not.toBe("HIGH");
    }
  });

  it("flags an IP-address URL with credential keywords as elevated risk", () => {
    const result = predictWithModel("http://192.168.45.12/login-verify-account");
    expect(result.riskScore).toBeGreaterThan(30);
  });

  it("exposes model metrics for transparency", () => {
    const result = predictWithModel("https://example.com");
    expect(result.modelMetrics).toHaveProperty("accuracy");
    expect(result.modelMetrics).toHaveProperty("trainedOn");
  });
});
