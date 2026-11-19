import type { Category } from "@/types";

export const categoryMeta: Record<
  Category,
  { label: string; blurb: string; emoji: string }
> = {
  kokum: {
    label: "Kokum & Amsul",
    blurb: "Solkadhi, sherbet & dried petals",
    emoji: "◎",
  },
  mango: {
    label: "Mango",
    blurb: "Hapus pulp, ambapoli & dried slices",
    emoji: "◆",
  },
  coconut: {
    label: "Coconut",
    blurb: "Oil, vinegar, chips & sugar",
    emoji: "●",
  },
  cashews: {
    label: "Cashews",
    blurb: "Roasted nuts, brittle & butters",
    emoji: "◇",
  },
  spices: {
    label: "Spices",
    blurb: "Malvani masalas & coastal blends",
    emoji: "✦",
  },
  sweets: {
    label: "Sweets",
    blurb: "Khajur, chikki & festive treats",
    emoji: "✧",
  },
  rice: {
    label: "Rice & Grains",
    blurb: "Ukda rice & traditional staples",
    emoji: "☰",
  },
  pickles: {
    label: "Pickles",
    blurb: "Homestyle achar from Konkan kitchens",
    emoji: "◈",
  },
};

export const categoryOrder: Category[] = [
  "kokum",
  "mango",
  "coconut",
  "cashews",
  "spices",
  "sweets",
  "rice",
  "pickles",
];
