"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";

export type DashNavItem = {
  id: string;
  label: string;
  badge?: number;
};

export function DashShell({
  title,
  subtitle,
  nav,
  active,
  onNavigate,
  onLogout,
  children,
  topRight,
}: {
  title: string;
  subtitle: string;
  nav: DashNavItem[];
  active: string;
  onNavigate: (id: string) => void;
  onLogout: () => void;
  children: ReactNode;
  topRight?: ReactNode;
}) {
  return (
    <div className="dash-root min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1400px]">
        <aside className="dash-sidebar hidden w-64 shrink-0 flex-col border-r border-sea/10 bg-white/70 p-4 backdrop-blur md:flex">
          <BrandLogo href="/" size="sm" />
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/40">
            {title}
          </p>
          <nav className="mt-3 flex flex-1 flex-col gap-1">
            {nav.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`dash-nav-item ${active === item.id ? "is-active" : ""}`}
              >
                <span>{item.label}</span>
                {typeof item.badge === "number" && item.badge > 0 ? (
                  <span className="dash-badge">{item.badge}</span>
                ) : null}
              </button>
            ))}
          </nav>
          <button type="button" className="btn-outline mt-4 w-full" onClick={onLogout}>
            Sign out
          </button>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-sea/10 bg-white/55 px-4 py-4 backdrop-blur sm:px-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-lagoon">
                KonkanProducts
              </p>
              <h1 className="font-display text-2xl text-ink sm:text-3xl">{title}</h1>
              <p className="mt-0.5 text-sm text-ink/55">{subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {topRight}
              <Link href="/" className="btn-ghost !text-ink !border-sea/15">
                Storefront
              </Link>
              <button type="button" className="btn-outline md:hidden" onClick={onLogout}>
                Sign out
              </button>
            </div>
          </header>

          <div className="flex gap-2 overflow-x-auto border-b border-sea/10 bg-white/40 px-4 py-2 md:hidden">
            {nav.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`dash-nav-item whitespace-nowrap ${
                  active === item.id ? "is-active" : ""
                }`}
              >
                {item.label}
                {typeof item.badge === "number" && item.badge > 0 ? (
                  <span className="dash-badge">{item.badge}</span>
                ) : null}
              </button>
            ))}
          </div>

          <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
