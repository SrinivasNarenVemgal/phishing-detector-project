import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col">
      <header className="border-b border-panel">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-mono-data text-[15px] text-[#dbe4ee]">
            phish<span className="text-accent">guard</span>
          </span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-muted hover:text-[#dbe4ee]">Sign in</Link>
            <Link
              href="/register"
              className="text-sm font-medium bg-accent text-[#0a0e14] px-4 py-2 rounded-md hover:opacity-90 transition"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-24 w-full">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs font-mono-data text-accent border border-panel bg-panel rounded-full px-3 py-1 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            RULE-BASED THREAT ANALYSIS
          </div>
          <h1 className="text-5xl font-semibold tracking-tight text-[#f2f6fa] leading-[1.1]">
            Know if it&apos;s a trap<br />before you click.
          </h1>
          <p className="mt-6 text-lg text-muted leading-relaxed">
            PhishGuard inspects URLs and email content for the patterns
            attackers rely on — fake domains, urgent language, credential
            requests — and returns a risk score in seconds.
          </p>
          <div className="mt-10 flex items-center gap-4">
            <Link
              href="/register"
              className="bg-accent text-[#0a0e14] font-medium px-6 py-3 rounded-md hover:opacity-90 transition"
            >
              Create free account
            </Link>
            <Link href="/login" className="text-muted hover:text-[#dbe4ee] font-medium">
              I already have an account →
            </Link>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-px bg-panel-border rounded-lg overflow-hidden border border-panel">
          {[
            { title: "URL Scanner", desc: "Checks HTTPS, domain structure, brand impersonation, and known shortener abuse." },
            { title: "Email Analyzer", desc: "Flags urgency tactics, credential requests, and embedded risky links." },
            { title: "Dashboard & History", desc: "Every scan is logged with a risk score you can revisit anytime." },
          ].map((f) => (
            <div key={f.title} className="bg-panel p-6">
              <h3 className="font-medium text-[#f2f6fa] mb-2">{f.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-auto border-t border-panel">
        <div className="max-w-6xl mx-auto px-6 py-6 text-xs text-muted font-mono-data">
          PhishGuard — educational cybersecurity project
        </div>
      </footer>
    </main>
  );
}
