const styles: Record<string, string> = {
  pending: "bg-mango/15 text-mango ring-mango/25",
  approved: "bg-lagoon/15 text-lagoon ring-lagoon/25",
  rejected: "bg-spice/15 text-spice ring-spice/25",
  active: "bg-lagoon/15 text-lagoon ring-lagoon/25",
  inactive: "bg-ink/10 text-ink/55 ring-ink/10",
  placed: "bg-sea/10 text-sea ring-sea/20",
  confirmed: "bg-lagoon/15 text-lagoon ring-lagoon/25",
  packed: "bg-mango/15 text-mango ring-mango/25",
  shipped: "bg-sea/10 text-sea ring-sea/20",
  out_for_delivery: "bg-mango/15 text-mango ring-mango/25",
  delivered: "bg-lagoon/15 text-lagoon ring-lagoon/25",
  paid: "bg-lagoon/15 text-lagoon ring-lagoon/25",
  unpaid: "bg-spice/15 text-spice ring-spice/25",
};

export function StatusBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  const key = status.toLowerCase().replace(/\s+/g, "_");
  const cls = styles[key] || "bg-ink/10 text-ink/60 ring-ink/10";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ${cls}`}
    >
      {label || status.replace(/_/g, " ")}
    </span>
  );
}
