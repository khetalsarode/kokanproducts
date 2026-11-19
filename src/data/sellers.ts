import type { Seller } from "@/types";

export const sellers: Seller[] = [
  {
    id: "kp-internal",
    name: "KokanProducts Kitchen",
    location: "Ratnagiri, Maharashtra",
    rating: 4.8,
  },
  {
    id: "sel-malvani",
    name: "Malvani Coast Collective",
    location: "Malvan, Sindhudurg",
    rating: 4.7,
  },
  {
    id: "sel-sawantwadi",
    name: "Sawantwadi Spice Guild",
    location: "Sawantwadi, Sindhudurg",
    rating: 4.6,
  },
  {
    id: "sel-alibag",
    name: "Alibag Coconut Co-op",
    location: "Alibag, Raigad",
    rating: 4.5,
  },
  {
    id: "sel-devgad",
    name: "Devgad Hapus Orchards",
    location: "Devgad, Sindhudurg",
    rating: 4.9,
  },
];

export function getSeller(id: string): Seller {
  return sellers.find((s) => s.id === id) ?? sellers[0];
}
