import { analyzeUrl } from "./detection";
import { predictWithModel } from "./mlModel";

const RULE_WEIGHT = 0.5;
const ML_WEIGHT = 0.5;

/**
 * Combines two independent signals into a single score:
 * 1. The hand-written rule engine (transparent, explainable, but limited to
 *    patterns a human thought to write down)
 * 2. A Logistic Regression model trained offline on ~2,000 real labeled
 *    phishing/legitimate URLs (learns weightings a human wouldn't necessarily
 *    pick, e.g. how much domain entropy matters relative to URL length)
 *
 * Averaging both is a simple but effective ensemble: it catches cases where
 * either signal alone would be wrong, and each shows up separately in the
 * response so the person can see where the score came from.
 */
export function analyzeUrlWithModel(rawUrl, extraKeywords = []) {
  const ruleResult = analyzeUrl(rawUrl, extraKeywords);
  const modelResult = predictWithModel(rawUrl);

  const combinedScore = Math.round(
    RULE_WEIGHT * ruleResult.riskScore + ML_WEIGHT * modelResult.riskScore
  );

  const riskLevel = combinedScore >= 60 ? "HIGH" : combinedScore >= 30 ? "MEDIUM" : "LOW";
  const status =
    riskLevel === "HIGH" ? "Suspicious Website" : riskLevel === "MEDIUM" ? "Potentially Risky" : "Likely Safe";
  const recommendation =
    riskLevel === "HIGH"
      ? "Avoid visiting this site and do not enter any information."
      : riskLevel === "MEDIUM"
      ? "Proceed with caution — verify the sender/source before entering data."
      : "No major red flags detected, but always stay alert.";

  const modelReason = `ML model estimates a ${modelResult.riskScore}% probability of phishing (Logistic Regression, trained on ${modelResult.modelMetrics.trainedOn} labeled URLs, ${Math.round(modelResult.modelMetrics.accuracy * 100)}% test accuracy).`;

  return {
    riskLevel,
    riskScore: combinedScore,
    status,
    recommendation,
    reasons: [...ruleResult.reasons, modelReason],
    breakdown: {
      ruleScore: ruleResult.riskScore,
      modelScore: modelResult.riskScore,
      modelProbability: modelResult.probability,
      modelMetrics: modelResult.modelMetrics,
    },
  };
}
