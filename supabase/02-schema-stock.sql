-- ============================================================
-- TABLA NUEVA: movimientos_stock
-- Pegar en Supabase → SQL Editor → Run
-- (además de las tablas productos y pedidos que ya creaste)
-- ============================================================

-- 0) La tabla productos guardaba el stock como sí/no (boolean).
--    Ahora lo pasamos a cantidad (número) para que tenga sentido con entradas/salidas.
--    Este bloque es seguro de correr más de una vez: si el stock ya es
--    numérico (porque ya lo convertiste antes), no hace nada.
do $$
begin
  if (select data_type from information_schema.columns
      where table_name = 'productos' and column_name = 'stock') = 'boolean' then
    alter table productos
      alter column stock type integer using (case when stock then 10 else 0 end),
      alter column stock set default 0;
  end if;
end $$;

create table if not exists movimientos_stock (
  id bigint primary key generated always as identity,
  producto_id bigint references productos(id) on delete set null,
  producto_nombre text not null,       -- se guarda aparte por si el producto se borra después
  tipo text not null,                  -- "entrada" | "salida"
  cantidad integer not null,
  motivo text,
  creado_en timestamptz not null default now()
);

alter table movimientos_stock enable row level security;

-- Solo el admin logueado puede ver y crear movimientos
drop policy if exists "movimientos: solo admin" on movimientos_stock;
create policy "movimientos: solo admin"
  on movimientos_stock for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
