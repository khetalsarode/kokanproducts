-- Food / warehouse inventory attributes for multi-vendor food products
alter table catalog_products
  add column if not exists warehouse_stock integer not null default 0;
alter table catalog_products
  add column if not exists warehouse_location text not null default '';
alter table catalog_products
  add column if not exists shelf_life_days integer not null default 0;
alter table catalog_products
  add column if not exists manufactured_on date;
alter table catalog_products
  add column if not exists best_before date;
alter table catalog_products
  add column if not exists batch_number text not null default '';
alter table catalog_products
  add column if not exists storage_instructions text not null default '';
alter table catalog_products
  add column if not exists temperature_zone text not null default 'ambient';
alter table catalog_products
  add column if not exists packaging_type text not null default '';
alter table catalog_products
  add column if not exists ingredients text not null default '';
alter table catalog_products
  add column if not exists allergens text not null default '';
alter table catalog_products
  add column if not exists fssai_license text not null default '';

-- Backfill warehouse stock from sellable stock where unset
update catalog_products
set warehouse_stock = stock
where warehouse_stock = 0 and stock > 0;

create index if not exists catalog_products_best_before_idx
  on catalog_products(best_before);
create index if not exists catalog_products_warehouse_stock_idx
  on catalog_products(warehouse_stock);
