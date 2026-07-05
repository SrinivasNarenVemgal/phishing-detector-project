"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

export default function Navbar({ user }) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const linkClass = (href) =>
    `text-sm font-medium transition-colors ${
      pathname === href ? "text-accent" : "text-muted hover:text-[#dbe4ee]"
    }`;

  return (
    <header className="border-b border-panel bg-panel/60 backdrop-blur sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-safe pulse-ring" />
          <span className="font-mono-data text-[15px] tracking-tight text-[#dbe4ee]">
            phish<span className="text-accent">guard</span>
          </span>
        </Link>

        {user && (
          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className={linkClass("/dashboard")}>Scanner</Link>
            <Link href="/dashboard/history" className={linkClass("/dashboard/history")}>History</Link>
            <Link href="/dashboard/reports" className={linkClass("/dashboard/reports")}>Reports</Link>
            {user.role === "admin" && (
              <Link href="/admin" className={linkClass("/admin")}>Admin</Link>
            )}
            <div className="flex items-center gap-3 pl-4 border-l border-panel">
              <span className="text-xs text-muted font-mono-data">{user.name}</span>
              <button
                onClick={handleLogout}
                className="text-xs text-muted hover:text-danger transition-colors"
              >
                Sign out
              </button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
