import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { HomeBestsellers, HomeFeatured } from "@/components/HomeCatalog";
import { HomeSlider } from "@/components/HomeSlider";
import { categoryMeta, categoryOrder } from "@/data/categories";
import { categoryImage, sectionImages } from "@/lib/productImages";

export default function HomePage() {
  return (
    <>
      <section className="hero-shell">
        <div className="hero-bg">
          <Image
            src={sectionImages.hero}
            alt="Konkan coastline"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div className="relative z-10 mx-auto flex min-h-[inherit] max-w-6xl flex-col justify-end px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32">
          <div className="reveal mb-4">
            <BrandLogo light size="lg" href="/" />
          </div>
          <p className="reveal text-xs uppercase tracking-[0.28em] text-mango">
            Direct from the Konkan coast
          </p>
          <h1 className="reveal reveal-delay-1 sr-only">KonkanProducts</h1>
          <p className="reveal reveal-delay-2 mt-4 max-w-md text-base text-foam/80 sm:text-lg">
            Authentic Konkan food — kokum, hapus, cashews & coconut — packed at source and shipped to your kitchen.
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

      <HomeSlider />

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
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {categoryOrder.map((key) => (
            <Link
              key={key}
              href={`/products?category=${key}`}
              className="group relative overflow-hidden rounded-sm"
            >
              <div className="relative h-28 w-full sm:h-36">
                <Image
                  src={categoryImage(key)}
                  alt={categoryMeta[key].label}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-sea/85 via-sea/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <p className="font-display text-lg text-foam">{categoryMeta[key].label}</p>
                  <p className="text-[11px] text-foam/75">{categoryMeta[key].blurb}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="section !pt-8">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-lagoon">Loved on the coast</p>
          <h2 className="mt-1 font-display text-3xl text-ink">Bestsellers</h2>
          <p className="mt-2 max-w-lg text-ink/60">
            The jars and pouches Konkan kitchens reorder — solkadhi, hapus, cashews, and masalas.
          </p>
        </div>
        <HomeBestsellers />
      </section>

      <section className="relative overflow-hidden border-y border-sea/10 text-foam">
        <div className="absolute inset-0">
          <Image
            src={sectionImages.why}
            alt="Coastal waters"
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-sea/88" />
        </div>
        <div className="section relative grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-mango">Why KonkanProducts</p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl">
              Good food. Local farmers. Sustainable future.
            </h2>
            <p className="mt-4 max-w-xl text-foam/75">
              We source from Ratnagiri, Devgad, Malvan, and Alibag — then fulfil from our own stock or ship direct from verified sellers. FSSAI-aligned listings. Clear tracking. Honest coastal flavours.
            </p>
          </div>
          <div className="relative hidden h-56 overflow-hidden rounded-sm md:block">
            <Image
              src={sectionImages.farm}
              alt="Farm fields"
              fill
              sizes="40vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section className="section">
        <HomeFeatured />
      </section>
    </>
  );
}
