export function KpiCard({
  label,
  value,
  hint,
  accent = "sea",
  alert = false,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "sea" | "lagoon" | "mango" | "spice";
  alert?: boolean;
}) {
  const accents = {
    sea: "from-sea/10 to-white",
    lagoon: "from-lagoon/10 to-white",
    mango: "from-mango/15 to-white",
    spice: "from-spice/10 to-white",
  };
  return (
    <div
      className={`dash-card relative overflow-hidden bg-gradient-to-br ${accents[accent]} ${
        alert ? "ring-1 ring-spice/30" : ""
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/45">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl text-ink tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink/50">{hint}</p> : null}
    </div>
  );
}
