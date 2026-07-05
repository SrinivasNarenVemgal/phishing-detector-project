const CONFIG = {
  HIGH: { color: "text-danger", bg: "bg-danger", label: "HIGH RISK" },
  MEDIUM: { color: "text-warn", bg: "bg-warn", label: "MEDIUM RISK" },
  LOW: { color: "text-safe", bg: "bg-safe", label: "LOW RISK" },
};

export default function RiskBadge({ level, size = "md" }) {
  const cfg = CONFIG[level] || CONFIG.LOW;
  const sizeClass = size === "lg" ? "text-sm px-3 py-1.5" : "text-[11px] px-2 py-0.5";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-mono-data font-semibold ${sizeClass} ${cfg.color}`}
      style={{ borderColor: "currentColor", background: "color-mix(in srgb, currentColor 10%, transparent)" }}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.bg}`} />
      {cfg.label}
    </span>
  );
}
