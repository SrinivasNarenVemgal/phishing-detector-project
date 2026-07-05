"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import RiskBadge from "@/components/RiskBadge";
import { useAuth } from "@/lib/useAuth";

export default function ReportsPage() {
  const user = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!user) return;
    fetch("/api/reports")
      .then((res) => res.json())
      .then((data) => {
        setReports(data.reports || []);
        setLoading(false);
      });
  }, [user]);

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
        className="flex-1 max-w-4xl mx-auto w-full px-6 py-10"
      >
        <h1 className="text-xl font-semibold text-[#f2f6fa] mb-2">Threat Reports</h1>
        <p className="text-sm text-muted mb-6">
          Generated from your scan history — a written record you can reference or share.
        </p>

        {loading ? (
          <p className="text-muted text-sm">Loading…</p>
        ) : reports.length === 0 ? (
          <div className="bg-panel border border-panel rounded-lg p-10 text-center text-muted text-sm">
            No reports yet. Go to Scan History and click &quot;Generate Report&quot; on any scan.
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r.id} className="bg-panel border border-panel rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-sm text-[#dbe4ee] font-medium">{r.summary}</p>
                    <p className="text-xs text-muted mt-1 font-mono-data">
                      {new Date(r.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <RiskBadge level={r.riskLevel} />
                </button>
                <AnimatePresence>
                  {expandedId === r.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-panel px-5 py-4 space-y-3">
                        <div>
                          <p className="text-xs text-muted mb-1">Scanned content</p>
                          <p className="text-sm text-[#dbe4ee] font-mono-data break-all">{r.details.content}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted mb-1">Detected signals</p>
                          <ul className="space-y-1">
                            {r.details.reasons.map((reason, i) => (
                              <li key={i} className="text-sm text-[#dbe4ee] flex gap-2">
                                <span className="text-accent mt-0.5">▸</span>
                                {reason}
                              </li>
                            ))}
                          </ul>
                        </div>
                        {r.details.domainAge && (
                          <div>
                            <p className="text-xs text-muted mb-1">Domain registered</p>
                            <p className="text-sm text-[#dbe4ee] font-mono-data">
                              {r.details.domainAge.registeredOn} · {r.details.domainAge.ageDays} days ago
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </motion.main>
    </>
  );
}
