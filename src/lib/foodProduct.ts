export type TemperatureZone = "ambient" | "chilled" | "frozen";

export type FoodInventoryFields = {
  warehouseStock: number;
  warehouseLocation: string;
  shelfLifeDays: number;
  manufacturedOn: string;
  bestBefore: string;
  batchNumber: string;
  storageInstructions: string;
  temperatureZone: TemperatureZone;
  packagingType: string;
  ingredients: string;
  allergens: string;
  fssaiLicense: string;
};

export type ShelfLifeStatus = "ok" | "expiring_soon" | "expired" | "unknown";

const ZONES: TemperatureZone[] = ["ambient", "chilled", "frozen"];

export function emptyFoodFields(): FoodInventoryFields {
  return {
    warehouseStock: 0,
    warehouseLocation: "",
    shelfLifeDays: 0,
    manufacturedOn: "",
    bestBefore: "",
    batchNumber: "",
    storageInstructions: "",
    temperatureZone: "ambient",
    packagingType: "",
    ingredients: "",
    allergens: "",
    fssaiLicense: "",
  };
}

/** Coerce optional Product food columns into form/API-ready fields. */
export function foodFieldsFromProduct(p: {
  warehouseStock?: number;
  warehouseLocation?: string;
  shelfLifeDays?: number;
  manufacturedOn?: string;
  bestBefore?: string;
  batchNumber?: string;
  storageInstructions?: string;
  temperatureZone?: TemperatureZone;
  packagingType?: string;
  ingredients?: string;
  allergens?: string;
  fssaiLicense?: string;
}): FoodInventoryFields {
  const zone = p.temperatureZone || "ambient";
  return {
    warehouseStock: Math.max(0, Number(p.warehouseStock) || 0),
    warehouseLocation: p.warehouseLocation || "",
    shelfLifeDays: Math.max(0, Number(p.shelfLifeDays) || 0),
    manufacturedOn: p.manufacturedOn || "",
    bestBefore: p.bestBefore || "",
    batchNumber: p.batchNumber || "",
    storageInstructions: p.storageInstructions || "",
    temperatureZone: ZONES.includes(zone) ? zone : "ambient",
    packagingType: p.packagingType || "",
    ingredients: p.ingredients || "",
    allergens: p.allergens || "",
    fssaiLicense: p.fssaiLicense || "",
  };
}

export function parseFoodFields(body: Record<string, unknown>): FoodInventoryFields {
  const zone = String(body.temperatureZone || "ambient") as TemperatureZone;
  return {
    warehouseStock: Math.max(0, Number(body.warehouseStock ?? body.warehouse_stock) || 0),
    warehouseLocation: String(body.warehouseLocation ?? body.warehouse_location ?? "").trim(),
    shelfLifeDays: Math.max(0, Number(body.shelfLifeDays ?? body.shelf_life_days) || 0),
    manufacturedOn: String(body.manufacturedOn ?? body.manufactured_on ?? "").slice(0, 10),
    bestBefore: String(body.bestBefore ?? body.best_before ?? "").slice(0, 10),
    batchNumber: String(body.batchNumber ?? body.batch_number ?? "").trim(),
    storageInstructions: String(
      body.storageInstructions ?? body.storage_instructions ?? "",
    ).trim(),
    temperatureZone: ZONES.includes(zone) ? zone : "ambient",
    packagingType: String(body.packagingType ?? body.packaging_type ?? "").trim(),
    ingredients: String(body.ingredients ?? "").trim(),
    allergens: String(body.allergens ?? "").trim(),
    fssaiLicense: String(body.fssaiLicense ?? body.fssai_license ?? "").trim(),
  };
}

export function shelfLifeStatus(bestBefore?: string | null): ShelfLifeStatus {
  if (!bestBefore) return "unknown";
  const end = new Date(`${bestBefore}T23:59:59`);
  if (Number.isNaN(end.getTime())) return "unknown";
  const now = new Date();
  if (end < now) return "expired";
  const soon = new Date();
  soon.setDate(soon.getDate() + 30);
  if (end <= soon) return "expiring_soon";
  return "ok";
}

export function shelfLifeLabel(status: ShelfLifeStatus): string {
  if (status === "expired") return "Expired";
  if (status === "expiring_soon") return "Expiring soon";
  if (status === "ok") return "Within shelf life";
  return "No date set";
}
