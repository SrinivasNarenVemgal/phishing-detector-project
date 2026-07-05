"""
Feature extraction for the phishing-URL model.
IMPORTANT: these features are deliberately simple and URL-text-only so that
the exact same logic can be reimplemented in JavaScript at inference time
(see lib/mlModel.js in the Node app) without needing a Python server.
"""
import re
import math
from urllib.parse import urlparse

SHORTENERS = {"bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly"}

SUSPICIOUS_WORDS = [
    "login", "verify", "secure", "account", "update", "confirm", "banking",
    "signin", "webscr", "password", "free", "bonus", "gift", "urgent",
    "suspend", "limited", "click", "wallet", "reset",
]

BRANDS = [
    "paypal", "google", "microsoft", "apple", "amazon", "netflix", "facebook",
    "instagram", "bankofamerica", "chase", "wellsfargo", "irs", "dhl", "fedex",
]


def shannon_entropy(s):
    if not s:
        return 0.0
    probs = [s.count(c) / len(s) for c in set(s)]
    return -sum(p * math.log2(p) for p in probs)


def extract_features(url):
    try:
        parsed = urlparse(url if re.match(r"^https?://", url) else f"http://{url}")
        hostname = (parsed.hostname or "").lower()
        path = parsed.path or ""
    except Exception:
        hostname = ""
        path = ""

    full = url.lower()
    domain_parts = hostname.split(".") if hostname else []

    is_https = 1 if url.lower().startswith("https://") else 0  # NOTE: excluded from training, see train.py
    url_length = len(url)
    num_dots = hostname.count(".")
    num_hyphens = hostname.count("-")
    num_digits = sum(c.isdigit() for c in hostname)
    num_subdomains = max(0, len(domain_parts) - 2)
    has_at_symbol = 1 if "@" in url else 0
    has_ip = 1 if re.search(r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}", hostname) else 0
    is_shortener = 1 if hostname in SHORTENERS else 0
    suspicious_word_count = sum(1 for w in SUSPICIOUS_WORDS if w in full)
    brand_mentioned_wrong_domain = 0
    for b in BRANDS:
        if b in hostname.replace(".", "") and not hostname.endswith(f"{b}.com") and hostname != f"{b}.com":
            brand_mentioned_wrong_domain = 1
            break
    path_length = len(path)
    domain_entropy = shannon_entropy(hostname)
    digit_ratio = num_digits / len(hostname) if hostname else 0

    return {
        "is_https": is_https,
        "url_length": url_length,
        "num_dots": num_dots,
        "num_hyphens": num_hyphens,
        "num_digits": num_digits,
        "num_subdomains": num_subdomains,
        "has_at_symbol": has_at_symbol,
        "has_ip": has_ip,
        "is_shortener": is_shortener,
        "suspicious_word_count": suspicious_word_count,
        "brand_mentioned_wrong_domain": brand_mentioned_wrong_domain,
        "path_length": path_length,
        "domain_entropy": domain_entropy,
        "digit_ratio": digit_ratio,
    }


FEATURE_ORDER = [
    "url_length", "num_dots", "num_hyphens", "num_digits",
    "num_subdomains", "has_at_symbol", "has_ip", "is_shortener",
    "suspicious_word_count", "brand_mentioned_wrong_domain", "path_length",
    "domain_entropy", "digit_ratio",
]
