// Runs a Logistic Regression model — trained offline in Python (see /ml/train.py
// in the project root) on ~2,000 real labeled phishing/legitimate URLs — directly
// in Node. Logistic regression is just: sigmoid(dot(scaled_features, weights) + bias),
// so it needs no ML runtime, no Python process, and no network call. This is what
// makes it practical to ship in a normal Node/Next.js production deployment.

import modelData from "./model.json";

const SHORTENERS = new Set(["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly"]);

const SUSPICIOUS_WORDS = [
  "login", "verify", "secure", "account", "update", "confirm", "banking",
  "signin", "webscr", "password", "free", "bonus", "gift", "urgent",
  "suspend", "limited", "click", "wallet", "reset",
];

const BRANDS = [
  "paypal", "google", "microsoft", "apple", "amazon", "netflix", "facebook",
  "instagram", "bankofamerica", "chase", "wellsfargo", "irs", "dhl", "fedex",
];

function shannonEntropy(s) {
  if (!s) return 0;
  const counts = {};
  for (const c of s) counts[c] = (counts[c] || 0) + 1;
  let entropy = 0;
  for (const c in counts) {
    const p = counts[c] / s.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

// Must mirror ml/features.py exactly — same feature order, same definitions —
// since the model's weights were learned against that exact feature layout.
function extractFeatures(rawUrl) {
  let hostname = "";
  let path = "";
  try {
    const withProtocol = /^https?:\/\//i.test(rawUrl) ? rawUrl : `http://${rawUrl}`;
    const parsed = new URL(withProtocol);
    hostname = parsed.hostname.toLowerCase();
    path = parsed.pathname || "";
  } catch {
    // leave blank; features degrade gracefully to "high risk looking" defaults
  }

  const full = rawUrl.toLowerCase();
  const domainParts = hostname ? hostname.split(".") : [];

  const urlLength = rawUrl.length;
  const numDots = (hostname.match(/\./g) || []).length;
  const numHyphens = (hostname.match(/-/g) || []).length;
  const numDigits = (hostname.match(/\d/g) || []).length;
  const numSubdomains = Math.max(0, domainParts.length - 2);
  const hasAtSymbol = rawUrl.includes("@") ? 1 : 0;
  const hasIp = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(hostname) ? 1 : 0;
  const isShortener = SHORTENERS.has(hostname) ? 1 : 0;
  const suspiciousWordCount = SUSPICIOUS_WORDS.filter((w) => full.includes(w)).length;
  let brandMentionedWrongDomain = 0;
  for (const b of BRANDS) {
    const noDots = hostname.replace(/\./g, "");
    if (noDots.includes(b) && hostname !== `${b}.com` && !hostname.endsWith(`.${b}.com`)) {
      brandMentionedWrongDomain = 1;
      break;
    }
  }
  const pathLength = path.length;
  const domainEntropy = shannonEntropy(hostname);
  const digitRatio = hostname.length ? numDigits / hostname.length : 0;

  return {
    url_length: urlLength,
    num_dots: numDots,
    num_hyphens: numHyphens,
    num_digits: numDigits,
    num_subdomains: numSubdomains,
    has_at_symbol: hasAtSymbol,
    has_ip: hasIp,
    is_shortener: isShortener,
    suspicious_word_count: suspiciousWordCount,
    brand_mentioned_wrong_domain: brandMentionedWrongDomain,
    path_length: pathLength,
    domain_entropy: domainEntropy,
    digit_ratio: digitRatio,
  };
}

function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

/**
 * Returns { probability, riskScore, riskLevel, modelMetrics }
 * probability = model's estimated chance (0-1) the URL is phishing.
 */
export function predictWithModel(rawUrl) {
  const feats = extractFeatures(rawUrl);
  const { featureOrder, scalerMean, scalerScale, coefficients, intercept, metrics } = modelData;

  let z = intercept;
  featureOrder.forEach((name, i) => {
    const raw = feats[name];
    const scaled = (raw - scalerMean[i]) / scalerScale[i];
    z += scaled * coefficients[i];
  });

  const probability = sigmoid(z);
  const riskScore = Math.round(probability * 100);
  const riskLevel = riskScore >= 60 ? "HIGH" : riskScore >= 30 ? "MEDIUM" : "LOW";

  return { probability, riskScore, riskLevel, modelMetrics: metrics, features: feats };
}
