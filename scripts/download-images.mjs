/**
 * Download curated Unsplash food photography into public/.
 * Photos are free to use under the Unsplash License.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function u(id, w = 1200) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;
}

/** Primary product shots — one unique photo per SKU */
const products = {
  "solkadhi-kokum-concentrate": "photo-1622597467836-f3285f2131b8", // pink drink
  "dried-kokum-petals": "photo-1599599810769-bcde5a95d37e", // dried fruit bowls
  "kokum-sherbet-mix": "photo-1556679343-c7306c1976bc", // iced pink drink
  "devgad-hapus-pulp": "photo-1553279768-865429fa0078", // mangoes
  "kairi-pickle": "photo-1589135227227-6f8f8f8f8f8f", // fallback handled below
  "dried-hapus-slices": "photo-1605027990121-cba94d09b5dd", // dried mango vibes
  "cold-pressed-coconut-oil": "photo-1525385133512-2f3bdd039054", // coconut oil
  "coconut-jaggery": "photo-1606313564200-e75d5e30476c", // jaggery/brown sugar
  "coconut-vinegar": "photo-1474979266404-7eaacbcd87c5", // olive/vinegar bottle style
  "roasted-coconut-chips": "photo-1587132137056-bfbf0166836e", // coconut
  "malvani-fish-masala": "photo-1596040033229-a9821ebd058d", // spices
  "kombdi-vade-masala": "photo-1596797038530-2c107229654b", // spice powders
  "tirphal-berries": "photo-1596040033229-a0b157d980c0", // berries/spices alt
  "phodni-masala": "photo-1506368249639-73a05d6f6488", // spice mix
  "dried-bombil": "photo-1519708227418-c8fd9a32b7a2", // fish
  "dried-prawns": "photo-1565680018434-b513bf5ece67", // prawns
  "bangda-pickle": "photo-1625944230945-1b7dd3b949ab", // fish dish
  "prawn-balchao": "photo-1559737558-2f5a35f4523b", // prawn curry
  "ukadiche-modak-mix": "photo-1601050690597-df0568f70950", // Indian sweets
  "khajur-rolls": "photo-1606312619070-d48b4cdc9be7", // dates
  "til-gud-chikki": "photo-1606313564200-e75d5e30476c", // sesame sweet
  "shrikhand-elaichi": "photo-1488477181946-6428a0291777", // yogurt dessert
  "ukda-rice": "photo-1586201375761-83865001e31c", // rice
  "ukda-rice-flour": "photo-1574323347407-f5e1ad6d020b", // flour
  "nachni-flour": "photo-1615485290382-441e4d049cb5", // millet/flour
  "karvand-pickle": "photo-1601050690117-94f5f6fa7f4b", // pickle jar
  "tendli-pickle": "photo-1599599810694-b5ac4ddaba0d", // green pickle
  "sol-kadhi-kit": "photo-1544145945-f90425340c7e", // pink drink kit vibe
  "cashew-feni-vinegar": "photo-1474979266404-7eaacbcd87c5", // vinegar bottle
  "jackfruit-chips": "photo-1587132137056-bfbf0166836e", // tropical chips
  "coconut-sugar": "photo-1606313564200-e75d5e30476c", // brown sugar
  ambapoli: "photo-1605027990121-cba94d09b5dd", // mango leather
};

// Fix bad IDs with verified Unsplash photos
const fixes = {
  "kairi-pickle": "photo-1601050690117-94f5f6fa7f4b",
  "tirphal-berries": "photo-1596040033229-a9821ebd058d",
  "til-gud-chikki": "photo-1606312619070-d48b4cdc9be7",
  "tendli-pickle": "photo-1601050690117-94f5f6fa7f4b",
  "jackfruit-chips": "photo-1605027990121-cba94d09b5dd",
  "coconut-sugar": "photo-1525385133512-2f3bdd039054",
};

for (const [k, v] of Object.entries(fixes)) products[k] = v;

/** Alternate gallery angles (lifestyle / plating) */
const gallery = {
  "solkadhi-kokum-concentrate": "photo-1544145945-f90425340c7e",
  "dried-kokum-petals": "photo-1615485290382-441e4d049cb5",
  "kokum-sherbet-mix": "photo-1622597467836-f3285f2131b8",
  "devgad-hapus-pulp": "photo-1605027990121-cba94d09b5dd",
  "kairi-pickle": "photo-1599599810769-bcde5a95d37e",
  "dried-hapus-slices": "photo-1553279768-865429fa0078",
  "cold-pressed-coconut-oil": "photo-1587132137056-bfbf0166836e",
  "coconut-jaggery": "photo-1525385133512-2f3bdd039054",
  "coconut-vinegar": "photo-1525385133512-2f3bdd039054",
  "roasted-coconut-chips": "photo-1525385133512-2f3bdd039054",
  "malvani-fish-masala": "photo-1596797038530-2c107229654b",
  "kombdi-vade-masala": "photo-1506368249639-73a05d6f6488",
  "tirphal-berries": "photo-1506368249639-73a05d6f6488",
  "phodni-masala": "photo-1596797038530-2c107229654b",
  "dried-bombil": "photo-1565680018434-b513bf5ece67",
  "dried-prawns": "photo-1519708227418-c8fd9a32b7a2",
  "bangda-pickle": "photo-1559737558-2f5a35f4523b",
  "prawn-balchao": "photo-1625944230945-1b7dd3b949ab",
  "ukadiche-modak-mix": "photo-1488477181946-6428a0291777",
  "khajur-rolls": "photo-1601050690597-df0568f70950",
  "til-gud-chikki": "photo-1601050690597-df0568f70950",
  "shrikhand-elaichi": "photo-1601050690597-df0568f70950",
  "ukda-rice": "photo-1574323347407-f5e1ad6d020b",
  "ukda-rice-flour": "photo-1586201375761-83865001e31c",
  "nachni-flour": "photo-1586201375761-83865001e31c",
  "karvand-pickle": "photo-1599599810769-bcde5a95d37e",
  "tendli-pickle": "photo-1599599810769-bcde5a95d37e",
  "sol-kadhi-kit": "photo-1556679343-c7306c1976bc",
  "cashew-feni-vinegar": "photo-1525385133512-2f3bdd039054",
  "jackfruit-chips": "photo-1553279768-865429fa0078",
  "coconut-sugar": "photo-1606312619070-d48b4cdc9be7",
  ambapoli: "photo-1553279768-865429fa0078",
};

const sections = {
  "hero-coast": { id: "photo-1507525428034-b723cf961d3e", w: 1920 }, // beach
  "hero-market": { id: "photo-1464226184884-fa280b87c399", w: 1600 }, // produce
  "why-konkan": { id: "photo-1544551763-46a013bb70d5", w: 1400 }, // coastal water
  "category-kokum": { id: "photo-1622597467836-f3285f2131b8", w: 900 },
  "category-mango": { id: "photo-1553279768-865429fa0078", w: 900 },
  "category-coconut": { id: "photo-1587132137056-bfbf0166836e", w: 900 },
  "category-spices": { id: "photo-1596040033229-a9821ebd058d", w: 900 },
  "category-seafood": { id: "photo-1565680018434-b513bf5ece67", w: 900 },
  "category-sweets": { id: "photo-1601050690597-df0568f70950", w: 900 },
  "category-rice": { id: "photo-1586201375761-83865001e31c", w: 900 },
  "category-pickles": { id: "photo-1601050690117-94f5f6fa7f4b", w: 900 },
  "trust-farm": { id: "photo-1500382017468-9049fed747ef", w: 1400 },
};

async function fetchOk(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function save(rel, url) {
  const path = join(root, "public", rel);
  await mkdir(dirname(path), { recursive: true });
  const buf = await fetchOk(url);
  await writeFile(path, buf);
  console.log(`ok ${rel} (${buf.length} bytes)`);
}

const jobs = [];

for (const [slug, id] of Object.entries(products)) {
  jobs.push(save(`products/${slug}.jpg`, u(id, 1000)));
  const g = gallery[slug];
  if (g) jobs.push(save(`products/${slug}-2.jpg`, u(g, 1000)));
}

for (const [name, meta] of Object.entries(sections)) {
  jobs.push(save(`sections/${name}.jpg`, u(meta.id, meta.w)));
}

const results = await Promise.allSettled(jobs);
const failed = results.filter((r) => r.status === "rejected");
for (const f of failed) console.error("FAIL", f.reason);
console.log(`done: ${results.length - failed.length}/${results.length}`);
if (failed.length) process.exit(1);
