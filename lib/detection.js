// Rule-based phishing detection (no external ML model required)

export const DEFAULT_SUSPICIOUS_URL_KEYWORDS = [
  "login", "verify", "secure", "account", "update", "confirm", "banking",
  "signin", "webscr", "password", "free", "bonus", "gift", "urgent",
  "suspend", "limited", "click", "wallet", "reset",
];

const KNOWN_BRANDS = [
  "paypal", "google", "microsoft", "apple", "amazon", "netflix", "facebook",
  "instagram", "bankofamerica", "chase", "wellsfargo", "irs", "dhl", "fedex",
];

const SHORTENERS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly"];

const URGENT_PHRASES = [
  "verify immediately", "account will be suspended", "act now", "urgent action required",
  "confirm your identity", "unusual activity", "click here immediately", "limited time",
  "your account has been locked", "update your payment", "failure to respond",
  "final notice", "you have won", "claim your prize", "reset your password immediately",
];

const CREDENTIAL_REQUEST_WORDS = [
  "password", "ssn", "social security", "credit card number", "cvv", "otp", "pin number",
  "bank account number", "login credentials", "verify your account",
];

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function analyzeUrl(rawUrl, extraKeywords = []) {
  const reasons = [];
  let score = 0;
  let hostname = "";
  let isHttps = false;
  const allKeywords = [...DEFAULT_SUSPICIOUS_URL_KEYWORDS, ...extraKeywords];

  let parsed;
  try {
    const withProtocol = /^https?:\/\//i.test(rawUrl) ? rawUrl : `http://${rawUrl}`;
    parsed = new URL(withProtocol);
    hostname = parsed.hostname.toLowerCase();
    isHttps = parsed.protocol === "https:";
  } catch {
    return {
      riskLevel: "HIGH",
      riskScore: 90,
      status: "Invalid / Malformed URL",
      recommendation: "Do not visit — the URL could not be parsed.",
      reasons: ["URL is malformed or not a valid web address."],
    };
  }

  if (!isHttps) {
    score += 20;
    reasons.push("Site does not use HTTPS (no valid SSL encryption).");
  }

  const domainParts = hostname.split(".");
  const subdomainCount = Math.max(0, domainParts.length - 2);
  if (subdomainCount >= 2) {
    score += 15;
    reasons.push("Unusually long/nested subdomain structure.");
  }

  if (hostname.includes("-") && domainParts.length >= 2) {
    const labelWithHyphen = domainParts.some((p) => p.includes("-") && p.length > 8);
    if (labelWithHyphen) {
      score += 10;
      reasons.push("Domain contains hyphens often used to mimic brand names.");
    }
  }

  if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(hostname)) {
    score += 25;
    reasons.push("URL uses a raw IP address instead of a domain name.");
  }

  const fullUrlLower = rawUrl.toLowerCase();
  const matchedKeywords = allKeywords.filter((k) => fullUrlLower.includes(k));
  if (matchedKeywords.length > 0) {
    score += Math.min(25, matchedKeywords.length * 8);
    reasons.push(`Contains suspicious keyword(s): ${matchedKeywords.slice(0, 5).join(", ")}.`);
  }

  const mentionedBrand = KNOWN_BRANDS.find((b) => hostname.replace(/\./g, "").includes(b) && !hostname.startsWith(b + "."));
  const exactBrandDomain = KNOWN_BRANDS.some((b) => hostname === `${b}.com` || hostname.endsWith(`.${b}.com`));
  if (mentionedBrand && !exactBrandDomain) {
    score += 30;
    reasons.push(`Domain references brand "${mentionedBrand}" but is not that brand's official domain.`);
  }

  if (SHORTENERS.some((s) => hostname === s)) {
    score += 15;
    reasons.push("URL uses a link shortener, which can hide the real destination.");
  }

  if (domainParts.some((p) => /^[a-z0-9]{12,}$/.test(p) && /\d/.test(p) && /[a-z]/.test(p))) {
    score += 10;
    reasons.push("Domain label looks randomly generated.");
  }

  score = clamp(score, 0, 100);

  let riskLevel, status, recommendation;
  if (score >= 60) {
    riskLevel = "HIGH";
    status = "Suspicious Website";
    recommendation = "Avoid visiting this site and do not enter any information.";
  } else if (score >= 30) {
    riskLevel = "MEDIUM";
    status = "Potentially Risky";
    recommendation = "Proceed with caution — verify the sender/source before entering data.";
  } else {
    riskLevel = "LOW";
    status = "Likely Safe";
    recommendation = "No major red flags detected, but always stay alert.";
  }

  if (reasons.length === 0) reasons.push("No suspicious patterns detected.");

  return { riskLevel, riskScore: score, status, recommendation, reasons };
}

export function analyzeEmail(content, extraKeywords = []) {
  const text = (content || "").toLowerCase();
  const reasons = [];
  let score = 0;

  const urgentMatches = URGENT_PHRASES.filter((p) => text.includes(p));
  if (urgentMatches.length > 0) {
    score += Math.min(40, urgentMatches.length * 15);
    reasons.push(`Uses urgent/threatening language ("${urgentMatches[0]}").`);
  }

  const credMatches = CREDENTIAL_REQUEST_WORDS.filter((p) => text.includes(p));
  if (credMatches.length > 0) {
    score += Math.min(35, credMatches.length * 12);
    reasons.push(`Requests sensitive credentials: ${credMatches.slice(0, 4).join(", ")}.`);
  }

  const urlMatches = text.match(/https?:\/\/[^\s)]+/g) || [];
  if (urlMatches.length > 0) {
    let worstLinkScore = 0;
    for (const u of urlMatches.slice(0, 5)) {
      const r = analyzeUrl(u, extraKeywords);
      worstLinkScore = Math.max(worstLinkScore, r.riskScore);
    }
    if (worstLinkScore >= 60) {
      score += 25;
      reasons.push("Contains a link flagged as high-risk.");
    } else if (worstLinkScore >= 30) {
      score += 12;
      reasons.push("Contains a link with some risky characteristics.");
    }
  }

  if (/dear (customer|user|valued member|sir\/madam)/.test(text)) {
    score += 8;
    reasons.push("Generic greeting instead of your actual name.");
  }

  if (/\$|prize|lottery|winner|inheritance/.test(text)) {
    score += 10;
    reasons.push("Mentions money, prizes, or lottery-style rewards.");
  }

  score = clamp(score, 0, 100);

  let riskLevel, status;
  if (score >= 50) {
    riskLevel = "HIGH";
    status = "Possible Phishing Attempt Detected";
  } else if (score >= 25) {
    riskLevel = "MEDIUM";
    status = "Some Suspicious Signals";
  } else {
    riskLevel = "LOW";
    status = "Likely Legitimate";
  }

  if (reasons.length === 0) reasons.push("No suspicious patterns detected.");

  return { riskLevel, riskScore: score, status, reasons };
}
