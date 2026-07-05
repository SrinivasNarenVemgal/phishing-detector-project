"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import RiskBadge from "@/components/RiskBadge";
import { useAuth } from "@/lib/useAuth";

export default function DashboardPage() {
  const user = useAuth();
  const [tab, setTab] = useState("url");
  const [urlInput, setUrlInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ total: 0, safe: 0, suspicious: 0 });

  const loadStats = useCallback(async () => {
    const res = await fetch("/api/history");
    if (res.ok) {
      const data = await res.json();
      setStats(data.stats);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loadStats fetches then sets state asynchronously, not synchronously
    if (user) loadStats();
  }, [user, loadStats]);

  async function runScan(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    const endpoint = tab === "url" ? "/api/scan/url" : "/api/scan/email";
    const body = tab === "url" ? { url: urlInput } : { content: emailInput };
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Scan failed.");
      } else {
        setResult(data);
        loadStats();
      }
    } catch {
      setError("Something went wrong. Try again.");
    }
    setLoading(false);
  }

  if (!user) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <span className="text-muted text-sm font-mono-data">loading…</span>
      </main>
    );
  }

  return (
    <>
      <Navbar user={user} />
      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex-1 max-w-6xl mx-auto w-full px-6 py-10"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <StatCard label="Total Scans" value={stats.total} />
          <StatCard label="Safe Results" value={stats.safe} tone="safe" />
          <StatCard label="Flagged Suspicious" value={stats.suspicious} tone="danger" />
        </div>

        <div className="bg-panel border border-panel rounded-lg overflow-hidden">
          <div className="flex border-b border-panel">
            <TabButton active={tab === "url"} onClick={() => { setTab("url"); setResult(null); setError(""); }}>
              URL Scanner
            </TabButton>
            <TabButton active={tab === "email"} onClick={() => { setTab("email"); setResult(null); setError(""); }}>
              Email Analyzer
            </TabButton>
          </div>

          <form onSubmit={runScan} className="p-6 space-y-4">
            {tab === "url" ? (
              <div>
                <label className="block text-xs text-muted mb-1.5">Website URL</label>
                <input
                  required
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="http://secure-paypal-login-free.com"
                  className="w-full bg-[#0a0e14] border border-panel rounded-md px-3 py-2.5 text-sm font-mono-data text-[#dbe4ee] focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs text-muted mb-1.5">Email or message content</label>
                <textarea
                  required
                  rows={6}
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Paste the suspicious email content here…"
                  className="w-full bg-[#0a0e14] border border-panel rounded-md px-3 py-2.5 text-sm text-[#dbe4ee] focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                />
              </div>
            )}

            {error && (
              <div className="text-danger text-sm bg-danger/10 border border-danger/30 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="bg-accent text-[#0a0e14] font-medium px-6 py-2.5 rounded-md hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? "Analyzing…" : "Run Scan"}
            </button>
          </form>

          {loading && (
            <div className="scanline border-t border-panel px-6 py-8 text-center text-muted text-sm font-mono-data">
              scanning for threat patterns…
            </div>
          )}

          {result && !loading && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.3 }}
              className="border-t border-panel p-6 space-y-4 overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-[#f2f6fa]">{result.status}</h3>
                <RiskBadge level={result.riskLevel} size="lg" />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-muted mb-1.5">
                  <span>Risk score</span>
                  <span className="font-mono-data">{result.riskScore}/100</span>
                </div>
                <div className="h-2 rounded-full bg-[#0a0e14] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result.riskScore}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      result.riskLevel === "HIGH" ? "bg-danger" : result.riskLevel === "MEDIUM" ? "bg-warn" : "bg-safe"
                    }`}
                  />
                </div>
              </div>

              {result.recommendation && (
                <p className="text-sm text-[#dbe4ee]">
                  <span className="text-muted">Recommendation: </span>
                  {result.recommendation}
                </p>
              )}

              {tab === "url" && result.breakdown && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#0a0e14] border border-panel rounded-md px-3 py-2">
                    <p className="text-muted mb-1">Rule engine score</p>
                    <p className="font-mono-data text-[#dbe4ee] text-sm">{result.breakdown.ruleScore}/100</p>
                  </div>
                  <div className="bg-[#0a0e14] border border-panel rounded-md px-3 py-2">
                    <p className="text-muted mb-1">ML model score</p>
                    <p className="font-mono-data text-[#dbe4ee] text-sm">
                      {result.breakdown.modelScore}/100
                      <span className="text-muted"> ({Math.round(result.breakdown.modelMetrics.accuracy * 100)}% test acc.)</span>
                    </p>
                  </div>
                </div>
              )}

              {tab === "url" && result.virusTotal && result.virusTotal.status !== "not_yet_scanned" && (
                <div className="flex items-center gap-2 text-xs bg-[#0a0e14] border border-panel rounded-md px-3 py-2">
                  <span className="text-muted">VirusTotal:</span>
                  <span className="text-[#dbe4ee] font-mono-data">
                    {result.virusTotal.malicious}/{result.virusTotal.totalEngines} engines flagged malicious
                  </span>
                </div>
              )}

              {tab === "url" && (
                <div className="flex items-center gap-2 text-xs bg-[#0a0e14] border border-panel rounded-md px-3 py-2">
                  <span className="text-muted">Domain registered:</span>
                  {result.domainAge === undefined ? null : result.domainAge ? (
                    <span className="text-[#dbe4ee] font-mono-data">
                      {result.domainAge.registeredOn} · {result.domainAge.ageDays} days ago
                    </span>
                  ) : (
                    <span className="text-muted font-mono-data">unavailable (privacy-protected or lookup failed)</span>
                  )}
                </div>
              )}

              <div>
                <p className="text-xs text-muted mb-2">Detected signals</p>
                <ul className="space-y-1.5">
                  {result.reasons.map((r, i) => (
                    <li key={i} className="text-sm text-[#dbe4ee] flex gap-2">
                      <span className="text-accent mt-0.5">▸</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </div>
      </motion.main>
    </>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
        active ? "border-accent text-accent" : "border-transparent text-muted hover:text-[#dbe4ee]"
      }`}
    >
      {children}
    </button>
  );
}

function StatCard({ label, value, tone }) {
  const toneClass = tone === "safe" ? "text-safe" : tone === "danger" ? "text-danger" : "text-[#f2f6fa]";
  return (
    <div className="bg-panel border border-panel rounded-lg p-5">
      <p className="text-xs text-muted mb-2">{label}</p>
      <p className={`text-3xl font-semibold font-mono-data ${toneClass}`}>{value}</p>
    </div>
  );
}
