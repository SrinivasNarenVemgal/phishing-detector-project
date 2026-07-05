"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed.");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="font-mono-data text-lg text-[#dbe4ee]">
            phish<span className="text-accent">guard</span>
          </Link>
          <p className="text-muted text-sm mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-panel border border-panel rounded-lg p-6 space-y-4">
          {error && (
            <div className="text-danger text-sm bg-danger/10 border border-danger/30 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs text-muted mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0a0e14] border border-panel rounded-md px-3 py-2 text-sm text-[#dbe4ee] focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0a0e14] border border-panel rounded-md px-3 py-2 text-sm text-[#dbe4ee] focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-[#0a0e14] font-medium py-2.5 rounded-md hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          No account?{" "}
          <Link href="/register" className="text-accent hover:underline">
            Register
          </Link>
        </p>
      </div>
    </main>
  );
}
