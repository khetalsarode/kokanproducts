import type { Category } from "@/types";

export const categoryMeta: Record<
  Category,
  { label: string; blurb: string; emoji: string }
> = {
  kokum: {
    label: "Kokum",
    blurb: "Tangy coastal cooler & curry staple",
    emoji: "🟣",
  },
  mango: {
    label: "Mango",
    blurb: "Hapus pulp, pickle & dried slices",
    emoji: "🥭",
  },
  coconut: {
    label: "Coconut",
    blurb: "Oil, vinegar, chips & sugar",
    emoji: "🥥",
  },
  spices: {
    label: "Spices",
    blurb: "Malvani masalas & coastal blends",
    emoji: "🌶️",
  },
  seafood: {
    label: "Dry Seafood",
    blurb: "Bombil, prawns & fish pickle",
    emoji: "🐟",
  },
  sweets: {
    label: "Sweets",
    blurb: "Khajur, chikki & festive treats",
    emoji: "🍬",
  },
  rice: {
    label: "Rice & Grains",
    blurb: "Ukda rice & traditional staples",
    emoji: "🌾",
  },
  pickles: {
    label: "Pickles",
    blurb: "Homestyle achar from Konkan kitchens",
    emoji: "🫙",
  },
};

export const categoryOrder: Category[] = [
  "kokum",
  "mango",
  "coconut",
  "spices",
  "seafood",
  "sweets",
  "rice",
  "pickles",
];
