"use client";

import type { FoodInventoryFields } from "@/lib/foodProduct";

export function FoodProductFields({
  value,
  onChange,
  disabled,
}: {
  value: FoodInventoryFields;
  onChange: (next: FoodInventoryFields) => void;
  disabled?: boolean;
}) {
  function set<K extends keyof FoodInventoryFields>(key: K, v: FoodInventoryFields[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="grid gap-3 rounded-xl border border-sea/10 bg-foam/50 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">
        Food & warehouse details
      </p>
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1 text-xs text-ink/60">
          Warehouse stock
          <input
            className="field"
            type="number"
            min={0}
            disabled={disabled}
            value={value.warehouseStock}
            onChange={(e) => set("warehouseStock", Math.max(0, Number(e.target.value) || 0))}
          />
        </label>
        <label className="grid gap-1 text-xs text-ink/60">
          Warehouse location
          <input
            className="field"
            disabled={disabled}
            placeholder="e.g. Ratnagiri WH-A"
            value={value.warehouseLocation}
            onChange={(e) => set("warehouseLocation", e.target.value)}
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <label className="grid gap-1 text-xs text-ink/60">
          Shelf life (days)
          <input
            className="field"
            type="number"
            min={0}
            disabled={disabled}
            value={value.shelfLifeDays}
            onChange={(e) => set("shelfLifeDays", Math.max(0, Number(e.target.value) || 0))}
          />
        </label>
        <label className="grid gap-1 text-xs text-ink/60">
          Manufactured on
          <input
            className="field"
            type="date"
            disabled={disabled}
            value={value.manufacturedOn}
            onChange={(e) => set("manufacturedOn", e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-xs text-ink/60">
          Best before
          <input
            className="field"
            type="date"
            disabled={disabled}
            value={value.bestBefore}
            onChange={(e) => set("bestBefore", e.target.value)}
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1 text-xs text-ink/60">
          Batch number
          <input
            className="field"
            disabled={disabled}
            value={value.batchNumber}
            onChange={(e) => set("batchNumber", e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-xs text-ink/60">
          Temperature zone
          <select
            className="field"
            disabled={disabled}
            value={value.temperatureZone}
            onChange={(e) =>
              set(
                "temperatureZone",
                e.target.value as FoodInventoryFields["temperatureZone"],
              )
            }
          >
            <option value="ambient">Ambient</option>
            <option value="chilled">Chilled</option>
            <option value="frozen">Frozen</option>
          </select>
        </label>
      </div>
      <label className="grid gap-1 text-xs text-ink/60">
        Packaging
        <input
          className="field"
          disabled={disabled}
          placeholder="Pouch / jar / tin"
          value={value.packagingType}
          onChange={(e) => set("packagingType", e.target.value)}
        />
      </label>
      <label className="grid gap-1 text-xs text-ink/60">
        Storage instructions
        <textarea
          className="field"
          rows={2}
          disabled={disabled}
          placeholder="Store in a cool, dry place…"
          value={value.storageInstructions}
          onChange={(e) => set("storageInstructions", e.target.value)}
        />
      </label>
      <label className="grid gap-1 text-xs text-ink/60">
        Ingredients
        <textarea
          className="field"
          rows={2}
          disabled={disabled}
          value={value.ingredients}
          onChange={(e) => set("ingredients", e.target.value)}
        />
      </label>
      <label className="grid gap-1 text-xs text-ink/60">
        Allergens
        <input
          className="field"
          disabled={disabled}
          placeholder="Nuts, milk, gluten…"
          value={value.allergens}
          onChange={(e) => set("allergens", e.target.value)}
        />
      </label>
      <label className="grid gap-1 text-xs text-ink/60">
        FSSAI license no.
        <input
          className="field"
          disabled={disabled}
          value={value.fssaiLicense}
          onChange={(e) => set("fssaiLicense", e.target.value)}
        />
      </label>
    </div>
  );
}
