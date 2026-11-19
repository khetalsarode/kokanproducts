export function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.4;
  const cls = size === "md" ? "text-base" : "text-xs";
  return (
    <span className={`inline-flex items-center gap-0.5 text-spice ${cls}`} aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < full || (i === full && half);
        return (
          <span key={i} className={filled ? "opacity-100" : "opacity-25"}>
            ★
          </span>
        );
      })}
    </span>
  );
}
