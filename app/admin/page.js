"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import RiskBadge from "@/components/RiskBadge";
import { useAuth } from "@/lib/useAuth";

export default function AdminPage() {
  const user = useAuth({ requireAdmin: true });
  const [tab, setTab] = useState("analytics");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [riskFilter, setRiskFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [query, setQuery] = useState("");
  const [defaultKeywords, setDefaultKeywords] = useState([]);
  const [customKeywords, setCustomKeywords] = useState([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [keywordError, setKeywordError] = useState("");
  const [reports, setReports] = useState([]);

  const loadStats = useCallback(() => {
    fetch("/api/admin/stats").then((r) => r.json()).then((d) => setStats(d.stats));
  }, []);
  const loadUsers = useCallback(() => {
    fetch("/api/admin/users").then((r) => r.json()).then((d) => setUsers(d.users || []));
  }, []);
  const loadLogs = useCallback(() => {
    const params = new URLSearchParams();
    if (riskFilter) params.set("risk", riskFilter);
    if (typeFilter) params.set("type", typeFilter);
    if (query) params.set("q", query);
    fetch(`/api/admin/logs?${params}`).then((r) => r.json()).then((d) => setLogs(d.scans || []));
  }, [riskFilter, typeFilter, query]);
  const loadKeywords = useCallback(() => {
    fetch("/api/admin/keywords")
      .then((r) => r.json())
      .then((d) => {
        setDefaultKeywords(d.defaultKeywords || []);
        setCustomKeywords(d.customKeywords || []);
      });
  }, []);
  const loadReports = useCallback(() => {
    fetch("/api/admin/reports").then((r) => r.json()).then((d) => setReports(d.reports || []));
  }, []);

  useEffect(() => {
    if (!user) return;
    loadStats();
    loadUsers();
    loadLogs();
    loadKeywords();
    loadReports();
  }, [user, loadStats, loadUsers, loadLogs, loadKeywords, loadReports]);

  async function toggleRole(u) {
    const newRole = u.role === "admin" ? "user" : "admin";
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.id, role: newRole }),
    });
    loadUsers();
  }

  async function addKeyword(e) {
    e.preventDefault();
    setKeywordError("");
    const res = await fetch("/api/admin/keywords", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword: newKeyword }),
    });
    const data = await res.json();
    if (!res.ok) {
      setKeywordError(data.error || "Failed to add keyword.");
      return;
    }
    setCustomKeywords(data.customKeywords);
    setNewKeyword("");
  }

  async function removeKeyword(keyword) {
    const res = await fetch("/api/admin/keywords", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword }),
    });
    const data = await res.json();
    if (res.ok) setCustomKeywords(data.customKeywords);
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
        <h1 className="text-xl font-semibold text-[#f2f6fa] mb-6">Admin Panel</h1>

        <div className="flex gap-1 mb-6 border-b border-panel overflow-x-auto">
          {["analytics", "users", "logs", "keywords", "reports"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 capitalize whitespace-nowrap transition-colors ${
                tab === t ? "border-accent text-accent" : "border-transparent text-muted hover:text-[#dbe4ee]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >

        {tab === "analytics" && stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total Users" value={stats.totalUsers} />
            <StatCard label="Total Scans" value={stats.totalScans} />
            <StatCard label="URL Scans" value={stats.urlScans} />
            <StatCard label="Email Scans" value={stats.emailScans} />
            <StatCard label="High Risk" value={stats.highRisk} tone="danger" />
            <StatCard label="Medium Risk" value={stats.mediumRisk} tone="warn" />
            <StatCard label="Low Risk" value={stats.lowRisk} tone="safe" />
          </div>
        )}

        {tab === "users" && (
          <div className="bg-panel border border-panel rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-panel text-left text-xs text-muted">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Scans</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-panel last:border-0">
                    <td className="px-5 py-3 text-[#dbe4ee]">{u.name}</td>
                    <td className="px-5 py-3 text-muted font-mono-data text-xs">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-mono-data uppercase ${u.role === "admin" ? "text-accent" : "text-muted"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[#dbe4ee] font-mono-data">{u.scanCount}</td>
                    <td className="px-5 py-3 text-muted text-xs font-mono-data">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      {u.id !== user.id && (
                        <button
                          onClick={() => toggleRole(u)}
                          className="text-xs text-accent hover:underline"
                        >
                          Make {u.role === "admin" ? "user" : "admin"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "logs" && (
          <div>
            <div className="flex flex-wrap gap-3 mb-4">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search content…"
                className="bg-panel border border-panel rounded-md px-3 py-2 text-sm text-[#dbe4ee] focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="bg-panel border border-panel rounded-md px-3 py-2 text-sm text-[#dbe4ee] focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">All risk levels</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-panel border border-panel rounded-md px-3 py-2 text-sm text-[#dbe4ee] focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">All types</option>
                <option value="url">URL</option>
                <option value="email">Email</option>
              </select>
            </div>

            <div className="bg-panel border border-panel rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-panel text-left text-xs text-muted">
                    <th className="px-5 py-3 font-medium">User</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Content</th>
                    <th className="px-5 py-3 font-medium">Risk</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((s) => (
                    <tr key={s.id} className="border-b border-panel last:border-0">
                      <td className="px-5 py-3 text-[#dbe4ee] text-xs">{s.userName}</td>
                      <td className="px-5 py-3 text-muted font-mono-data text-xs uppercase">{s.scanType}</td>
                      <td className="px-5 py-3 max-w-xs truncate text-[#dbe4ee] font-mono-data text-xs">{s.content}</td>
                      <td className="px-5 py-3"><RiskBadge level={s.riskLevel} /></td>
                      <td className="px-5 py-3 text-muted text-xs font-mono-data">
                        {new Date(s.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {logs.length === 0 && (
                <p className="text-center text-muted text-sm py-8">No matching scans.</p>
              )}
            </div>
          </div>
        )}
        {tab === "keywords" && (
          <div className="space-y-6 max-w-2xl">
            <div className="bg-panel border border-panel rounded-lg p-5">
              <h3 className="text-sm font-medium text-[#f2f6fa] mb-1">Add a suspicious keyword</h3>
              <p className="text-xs text-muted mb-4">
                Any URL or email containing this word gets flagged by the rule engine, in addition to the built-in list.
              </p>
              <form onSubmit={addKeyword} className="flex gap-2">
                <input
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="e.g. crypto-giveaway"
                  className="flex-1 bg-[#0a0e14] border border-panel rounded-md px-3 py-2 text-sm text-[#dbe4ee] focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                  type="submit"
                  className="bg-accent text-[#0a0e14] font-medium px-4 py-2 rounded-md hover:opacity-90 transition text-sm"
                >
                  Add
                </button>
              </form>
              {keywordError && <p className="text-danger text-xs mt-2">{keywordError}</p>}
            </div>

            <div>
              <h3 className="text-sm font-medium text-[#f2f6fa] mb-2">Custom keywords ({customKeywords.length})</h3>
              {customKeywords.length === 0 ? (
                <p className="text-xs text-muted">None added yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {customKeywords.map((k) => (
                    <span
                      key={k}
                      className="inline-flex items-center gap-2 text-xs font-mono-data bg-panel border border-panel rounded-full px-3 py-1.5 text-[#dbe4ee]"
                    >
                      {k}
                      <button onClick={() => removeKeyword(k)} className="text-muted hover:text-danger">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium text-[#f2f6fa] mb-2">Built-in keywords ({defaultKeywords.length})</h3>
              <p className="text-xs text-muted mb-2">Defined in code (lib/detection.js) — not editable here.</p>
              <div className="flex flex-wrap gap-2">
                {defaultKeywords.map((k) => (
                  <span
                    key={k}
                    className="text-xs font-mono-data bg-[#0a0e14] border border-panel rounded-full px-3 py-1.5 text-muted"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "reports" && (
          <div className="bg-panel border border-panel rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-panel text-left text-xs text-muted">
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Summary</th>
                  <th className="px-5 py-3 font-medium">Risk</th>
                  <th className="px-5 py-3 font-medium">Generated</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} className="border-b border-panel last:border-0">
                    <td className="px-5 py-3 text-[#dbe4ee] text-xs">{r.userName}</td>
                    <td className="px-5 py-3 text-muted font-mono-data text-xs uppercase">{r.reportType}</td>
                    <td className="px-5 py-3 max-w-md truncate text-[#dbe4ee] text-xs">{r.summary}</td>
                    <td className="px-5 py-3"><RiskBadge level={r.riskLevel} /></td>
                    <td className="px-5 py-3 text-muted text-xs font-mono-data">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {reports.length === 0 && (
              <p className="text-center text-muted text-sm py-8">No reports generated yet.</p>
            )}
          </div>
        )}

        </motion.div>
        </AnimatePresence>
      </motion.main>
    </>
  );
}

function StatCard({ label, value, tone }) {
  const toneClass = tone === "safe" ? "text-safe" : tone === "danger" ? "text-danger" : tone === "warn" ? "text-warn" : "text-[#f2f6fa]";
  return (
    <div className="bg-panel border border-panel rounded-lg p-5">
      <p className="text-xs text-muted mb-2">{label}</p>
      <p className={`text-2xl font-semibold font-mono-data ${toneClass}`}>{value}</p>
    </div>
  );
}
