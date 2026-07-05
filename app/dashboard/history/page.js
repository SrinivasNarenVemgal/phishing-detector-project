"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import RiskBadge from "@/components/RiskBadge";
import { useAuth } from "@/lib/useAuth";

export default function HistoryPage() {
  const user = useAuth();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState(null);
  const [generatedIds, setGeneratedIds] = useState(new Set());

  useEffect(() => {
    if (!user) return;
    fetch("/api/history")
      .then((res) => res.json())
      .then((data) => {
        setScans(data.scans || []);
        setLoading(false);
      });
  }, [user]);

  async function generateReport(scanId) {
    setGeneratingId(scanId);
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scanId }),
    });
    if (res.ok) {
      setGeneratedIds((prev) => new Set(prev).add(scanId));
    }
    setGeneratingId(null);
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-[#f2f6fa]">Scan History</h1>
          <Link href="/dashboard/reports" className="text-sm text-accent hover:underline">
            View my reports →
          </Link>
        </div>

        {loading ? (
          <p className="text-muted text-sm">Loading…</p>
        ) : scans.length === 0 ? (
          <div className="bg-panel border border-panel rounded-lg p-10 text-center text-muted text-sm">
            No scans yet. Run a scan from the Scanner tab to see it here.
          </div>
        ) : (
          <div className="bg-panel border border-panel rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-panel text-left text-xs text-muted">
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Content</th>
                  <th className="px-5 py-3 font-medium">Result</th>
                  <th className="px-5 py-3 font-medium">Risk</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {scans.map((s) => (
                  <tr key={s.id} className="border-b border-panel last:border-0">
                    <td className="px-5 py-3 text-muted font-mono-data text-xs uppercase">{s.scanType}</td>
                    <td className="px-5 py-3 max-w-xs truncate text-[#dbe4ee] font-mono-data text-xs">
                      {s.content}
                    </td>
                    <td className="px-5 py-3 text-[#dbe4ee]">{s.result}</td>
                    <td className="px-5 py-3">
                      <RiskBadge level={s.riskLevel} />
                    </td>
                    <td className="px-5 py-3 text-muted text-xs font-mono-data">
                      {new Date(s.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-3">
                      {generatedIds.has(s.id) ? (
                        <span className="text-xs text-safe">Report ready ✓</span>
                      ) : (
                        <button
                          onClick={() => generateReport(s.id)}
                          disabled={generatingId === s.id}
                          className="text-xs text-accent hover:underline disabled:opacity-50"
                        >
                          {generatingId === s.id ? "Generating…" : "Generate Report"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.main>
    </>
  );
}
