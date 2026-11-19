import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { categoryMeta, categoryOrder } from "@/data/categories";
import { products } from "@/data/products";

export default function HomePage() {
  const bestsellers = products.filter((p) => p.tags.includes("bestseller")).slice(0, 8);
  const featured = products.slice(0, 4);

  return (
    <>
      <section className="hero-shell">
        <div className="hero-bg" />
        <div className="relative z-10 mx-auto flex min-h-[inherit] max-w-6xl flex-col justify-end px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32">
          <p className="reveal text-xs uppercase tracking-[0.28em] text-mango">
            Direct from the Konkan coast
          </p>
          <h1 className="reveal reveal-delay-1 mt-3 max-w-3xl font-display text-5xl leading-[1.05] tracking-tight text-foam sm:text-6xl md:text-7xl">
            KokanProducts
          </h1>
          <p className="reveal reveal-delay-2 mt-4 max-w-md text-base text-foam/80 sm:text-lg">
            Authentic Konkan food — kokum, hapus, bombil & coastal spices — packed at source and shipped to your kitchen.
          </p>
          <div className="reveal reveal-delay-3 mt-8 flex flex-wrap gap-3">
            <Link href="/products" className="btn-primary !bg-foam !text-sea hover:!bg-white">
              Shop the coast
            </Link>
            <Link href="/products?tag=bestseller" className="btn-ghost">
              Bestsellers
            </Link>
          </div>
        </div>
      </section>

      <section className="section !pt-10 !pb-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-lagoon">Browse</p>
            <h2 className="mt-1 font-display text-3xl text-ink">Coastal pantry</h2>
          </div>
          <Link href="/products" className="text-sm font-medium text-sea hover:underline">
            View all →
          </Link>
        </div>
        <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
          {categoryOrder.map((key) => (
            <Link key={key} href={`/products?category=${key}`} className="chip shrink-0">
              <span aria-hidden>{categoryMeta[key].emoji}</span>
              {categoryMeta[key].label}
            </Link>
          ))}
        </div>
      </section>

      <section className="section !pt-8">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-lagoon">Loved on the coast</p>
          <h2 className="mt-1 font-display text-3xl text-ink">Bestsellers</h2>
          <p className="mt-2 max-w-lg text-ink/60">
            The jars and pouches Konkan kitchens reorder — solkadhi, hapus, bombil, and masalas.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
          {bestsellers.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-sea/10 bg-sea/95 text-foam">
        <div className="absolute inset-0 opacity-30 wave-overlay" />
        <div className="section relative grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-mango">Why KokanProducts</p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl">
              Good food. Local farmers. Sustainable future.
            </h2>
            <p className="mt-4 max-w-xl text-foam/75">
              We source from Ratnagiri, Devgad, Malvan, and Alibag — then fulfil from our own stock or ship direct from verified sellers. FSSAI-aligned listings. Clear tracking. Honest coastal flavours.
            </p>
          </div>
          <ul className="space-y-4 text-sm">
            <li className="border-l-2 border-mango pl-4">
              <strong className="block text-foam">Direct from source</strong>
              <span className="text-foam/65">Orchards, co-ops & coastal kitchens — not generic warehouses.</span>
            </li>
            <li className="border-l-2 border-mango pl-4">
              <strong className="block text-foam">Internal + marketplace</strong>
              <span className="text-foam/65">See who packs each order on the product page.</span>
            </li>
            <li className="border-l-2 border-mango pl-4">
              <strong className="block text-foam">Pay your way</strong>
              <span className="text-foam/65">UPI, cards, wallets, or cash on delivery (demo checkout).</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="section">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-lagoon">Fresh picks</p>
            <h2 className="mt-1 font-display text-3xl text-ink">Just landed</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </>
  );
}
