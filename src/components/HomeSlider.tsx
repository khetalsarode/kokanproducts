"use client";

import Image from "next/image";
import Link from "next/link";

const slides = [
  {
    src: "/slider/slider-mango-orchard.jpg",
    title: "Devgad hapus orchards",
    blurb: "Sun-ripened Alphonso from the Konkan hinterland.",
  },
  {
    src: "/slider/slider-cashew-plantation.jpg",
    title: "Vengurla cashew groves",
    blurb: "Buttery kernels roasted the coastal way.",
  },
  {
    src: "/slider/slider-coconut-coast.jpg",
    title: "Palm-lined Konkan coast",
    blurb: "Coconut oil, vinegar, chips & sugar from the shore.",
  },
  {
    src: "/slider/slider-kokum-harvest.jpg",
    title: "Kokum & amsul harvest",
    blurb: "Magenta solkadhi and pantry souring agents.",
  },
  {
    src: "/slider/slider-konkan-market.jpg",
    title: "Coastal market culture",
    blurb: "Masalas, mangoes and tradition in every basket.",
  },
  {
    src: "/sections/hero-coast.jpg",
    title: "From Konkan, for your kitchen",
    blurb: "Authentic products packed at source.",
  },
];

/** Continuous marquee of Konkan scenes — duplicated track for seamless loop. */
export function HomeSlider() {
  const track = [...slides, ...slides];

  return (
    <section className="relative overflow-hidden border-b border-sea/10 bg-sea/95" aria-label="Konkan stories">
      <div className="mx-auto flex max-w-6xl items-end justify-between gap-4 px-4 pb-3 pt-6 sm:px-6">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-mango">Konkan in motion</p>
          <h2 className="mt-1 font-display text-2xl text-foam sm:text-3xl">
            Orchards, palms & coastal kitchens
          </h2>
        </div>
        <Link href="/products" className="hidden text-sm font-medium text-foam/80 hover:text-foam sm:inline">
          Shop the coast →
        </Link>
      </div>

      <div className="slider-mask pb-6 pt-2">
        <div className="slider-track">
          {track.map((slide, i) => (
            <article
              key={`${slide.src}-${i}`}
              className="relative h-52 w-[min(78vw,28rem)] shrink-0 overflow-hidden rounded-sm sm:h-64"
            >
              <Image
                src={slide.src}
                alt={slide.title}
                fill
                sizes="(max-width: 640px) 78vw, 28rem"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-sea/90 via-sea/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="font-display text-lg text-foam">{slide.title}</p>
                <p className="mt-0.5 text-xs text-foam/75">{slide.blurb}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
