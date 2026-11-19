"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useShop } from "@/context/ShopContext";
import type { Address } from "@/types";

export default function AccountPage() {
  const { addresses, saveAddress, removeAddress, orders, wishlist, ready } = useShop();
  const [form, setForm] = useState({
    label: "Home",
    name: "",
    phone: "",
    line1: "",
    city: "",
    state: "Maharashtra",
    pincode: "",
  });

  if (!ready) return <div className="section text-ink/50">Loading account…</div>;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name || !form.line1 || !form.city || !form.pincode) return;
    const address: Address = {
      id: `addr-${Date.now()}`,
      label: form.label || "Address",
      name: form.name,
      phone: form.phone || "—",
      line1: form.line1,
      city: form.city,
      state: form.state,
      pincode: form.pincode,
    };
    saveAddress(address);
    setForm({
      label: "Home",
      name: "",
      phone: "",
      line1: "",
      city: "",
      state: "Maharashtra",
      pincode: "",
    });
  }

  return (
    <div className="section !pt-8">
      <h1 className="font-display text-4xl text-ink">Profile</h1>
      <p className="mt-2 text-ink/60">
        Demo profile — saved in this browser. Sign-in comes with private publish later.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link href="/orders" className="rounded-sm bg-white/55 p-4 hover:bg-white/80">
          <p className="text-xs uppercase tracking-[0.15em] text-lagoon">Orders</p>
          <p className="font-display text-2xl">{orders.length}</p>
        </Link>
        <Link href="/wishlist" className="rounded-sm bg-white/55 p-4 hover:bg-white/80">
          <p className="text-xs uppercase tracking-[0.15em] text-lagoon">Wishlist</p>
          <p className="font-display text-2xl">{wishlist.length}</p>
        </Link>
        <Link href="/returns" className="rounded-sm bg-white/55 p-4 hover:bg-white/80">
          <p className="text-xs uppercase tracking-[0.15em] text-lagoon">Returns</p>
          <p className="font-display text-2xl">→</p>
        </Link>
      </div>

      <section className="mt-12">
        <h2 className="font-display text-2xl">Addresses</h2>
        <ul className="mt-4 space-y-3">
          {addresses.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-sm border border-sea/10 bg-white/50 p-4"
            >
              <div className="text-sm">
                <p className="font-medium">
                  {a.label}
                  {a.isDefault ? " · Default" : ""}
                </p>
                <p className="mt-1 text-ink/70">
                  {a.name} · {a.phone}
                  <br />
                  {a.line1}
                  {a.line2 ? `, ${a.line2}` : ""}
                  <br />
                  {a.city}, {a.state} {a.pincode}
                </p>
              </div>
              {!a.isDefault && (
                <button
                  type="button"
                  className="text-sm text-spice hover:underline"
                  onClick={() => removeAddress(a.id)}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 max-w-xl">
        <h2 className="font-display text-2xl">Add address</h2>
        <form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            className="field"
            placeholder="Label"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
          <input
            className="field"
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className="field sm:col-span-2"
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <input
            className="field sm:col-span-2"
            placeholder="Address line"
            value={form.line1}
            onChange={(e) => setForm({ ...form, line1: e.target.value })}
            required
          />
          <input
            className="field"
            placeholder="City"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            required
          />
          <input
            className="field"
            placeholder="Pincode"
            value={form.pincode}
            onChange={(e) => setForm({ ...form, pincode: e.target.value })}
            required
          />
          <button type="submit" className="btn-primary sm:col-span-2 w-fit">
            Save address
          </button>
        </form>
      </section>
    </div>
  );
}
