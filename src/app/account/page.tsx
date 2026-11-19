"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useShop } from "@/context/ShopContext";
import type { Address } from "@/types";

export default function AccountPage() {
  const { ready: authReady, customer, logout, updateProfile, changePassword } =
    useAuth();
  const { addresses, saveAddress, removeAddress, orders, wishlist, ready } =
    useShop();
  const [profile, setProfile] = useState({ name: "", phone: "" });
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    label: "Home",
    name: "",
    phone: "",
    line1: "",
    city: "",
    state: "Maharashtra",
    pincode: "",
  });

  useEffect(() => {
    if (!customer) return;
    setProfile({ name: customer.name, phone: customer.phone });
  }, [customer]);

  if (!authReady || !ready) {
    return <div className="section text-ink/50">Loading account…</div>;
  }

  if (!customer) {
    return (
      <div className="section !pt-10 max-w-xl">
        <h1 className="font-display text-4xl text-ink">Your account</h1>
        <p className="mt-3 text-ink/65">
          Create an account to save addresses, sync your wishlist, and track orders
          across devices — just like a full e-commerce store.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/customer/register" className="btn-primary">
            Create account
          </Link>
          <Link href="/customer/login" className="btn-outline">
            Sign in
          </Link>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="rounded-sm bg-white/55 p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-lagoon">Guest bag</p>
            <p className="mt-1 text-sm text-ink/60">Cart still works without signing in.</p>
          </div>
          <div className="rounded-sm bg-white/55 p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-lagoon">Local wishlist</p>
            <p className="mt-1 text-sm text-ink/60">{wishlist.length} saved in this browser</p>
          </div>
          <div className="rounded-sm bg-white/55 p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-lagoon">Local orders</p>
            <p className="mt-1 text-sm text-ink/60">{orders.length} demo orders here</p>
          </div>
        </div>
      </div>
    );
  }

  async function onProfile(e: FormEvent) {
    e.preventDefault();
    const err = await updateProfile(profile);
    setProfileMsg(err || "Profile updated.");
  }

  async function onPassword(e: FormEvent) {
    e.preventDefault();
    if (pw.next !== pw.confirm) {
      setPwMsg("New passwords do not match.");
      return;
    }
    const err = await changePassword(pw.current, pw.next);
    if (err) {
      setPwMsg(err);
      return;
    }
    setPw({ current: "", next: "", confirm: "" });
    setPwMsg("Password changed.");
  }

  function onAddress(e: FormEvent) {
    e.preventDefault();
    if (!form.name || !form.line1 || !form.city || !form.pincode) return;
    const address: Address = {
      id: `addr-${Date.now()}`,
      label: form.label || "Address",
      name: form.name,
      phone: form.phone || customer?.phone || "—",
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-ink">Hi, {customer.name.split(" ")[0]}</h1>
          <p className="mt-2 text-ink/60">{customer.email}</p>
        </div>
        <button
          type="button"
          className="btn-outline"
          onClick={() => void logout()}
        >
          Sign out
        </button>
      </div>

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

      <section className="mt-12 max-w-xl">
        <h2 className="font-display text-2xl">Profile</h2>
        <form onSubmit={onProfile} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            className="field sm:col-span-2"
            placeholder="Full name"
            value={profile.name || customer.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            required
          />
          <input
            className="field sm:col-span-2"
            placeholder="Phone"
            value={profile.phone || customer.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
          />
          <p className="sm:col-span-2 text-sm text-ink/50">Email cannot be changed: {customer.email}</p>
          {profileMsg && <p className="sm:col-span-2 text-sm text-lagoon">{profileMsg}</p>}
          <button type="submit" className="btn-primary w-fit">
            Save profile
          </button>
        </form>
      </section>

      <section className="mt-12 max-w-xl">
        <h2 className="font-display text-2xl">Change password</h2>
        <form onSubmit={onPassword} className="mt-4 grid gap-3">
          <input
            className="field"
            type="password"
            placeholder="Current password"
            value={pw.current}
            onChange={(e) => setPw({ ...pw, current: e.target.value })}
            required
          />
          <input
            className="field"
            type="password"
            placeholder="New password"
            value={pw.next}
            onChange={(e) => setPw({ ...pw, next: e.target.value })}
            required
            minLength={8}
          />
          <input
            className="field"
            type="password"
            placeholder="Confirm new password"
            value={pw.confirm}
            onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
            required
            minLength={8}
          />
          {pwMsg && <p className="text-sm text-lagoon">{pwMsg}</p>}
          <button type="submit" className="btn-outline w-fit">
            Update password
          </button>
        </form>
      </section>

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
        <form onSubmit={onAddress} className="mt-4 grid gap-3 sm:grid-cols-2">
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
