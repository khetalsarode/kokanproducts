import Image from "next/image";
import Link from "next/link";

export function BrandLogo({
  href = "/",
  size = "md",
  light = false,
  showWordmark = true,
}: {
  href?: string;
  size?: "sm" | "md" | "lg";
  light?: boolean;
  showWordmark?: boolean;
}) {
  const px = size === "sm" ? 28 : size === "lg" ? 44 : 34;
  const text =
    size === "sm" ? "text-lg" : size === "lg" ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl";

  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2"
      aria-label="KonkanProducts home"
    >
      <span
        className="relative shrink-0 overflow-hidden rounded-full ring-1 ring-sea/15 bg-white/90"
        style={{ width: px, height: px }}
      >
        <Image
          src="/brand/logo.jpg"
          alt=""
          width={px}
          height={px}
          className="h-full w-full object-cover"
          priority={size !== "sm"}
        />
      </span>
      {showWordmark && (
        <span
          className={`font-display tracking-tight ${text} ${
            light ? "text-foam" : "text-sea"
          } group-hover:opacity-90`}
        >
          KonkanProducts
        </span>
      )}
    </Link>
  );
}
