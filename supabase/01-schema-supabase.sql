-- ============================================================
-- ESQUEMA DE BASE DE DATOS — neyco autoservicio
-- Pegar esto en Supabase → SQL Editor → Run
-- Seguro de correr más de una vez: no rompe nada si ya existe.
-- ============================================================

-- Tabla de productos (reemplaza el array fijo que hoy vive en el código)
create table if not exists productos (
  id bigint primary key generated always as identity,
  nombre text not null,
  categoria text not null,
  tamano text,                          -- ej: "500g", "pack x2", "individual"
  variantes text[],                     -- columna vieja sin uso, las variantes reales viven en producto_variantes
  precio integer not null,
  foto text,                            -- url de la imagen (Supabase Storage)
  emoji text,                           -- respaldo visual mientras falta foto real
  stock boolean not null default true,  -- se convierte a número en 02-schema-stock.sql
  creado_en timestamptz not null default now()
);

-- Tabla de pedidos (se llena sola cada vez que un cliente hace checkout)
create table if not exists pedidos (
  id bigint primary key generated always as identity,
  numero_orden text unique not null,
  cliente_nombre text,
  modo_entrega text,                    -- "retira" | "envio"
  direccion text,
  telefono text,
  items jsonb not null,                 -- [{ nombre, cantidad, precio }, ...]
  total integer not null,
  estado text not null default 'pendiente',  -- pendiente | confirmado | entregado
  creado_en timestamptz not null default now()
);

-- ============================================================
-- SEGURIDAD (Row Level Security) — quién puede ver/tocar qué
-- ============================================================
alter table productos enable row level security;
alter table pedidos enable row level security;

-- Cualquiera puede VER el catálogo (necesario para que la web pública funcione)
drop policy if exists "productos: lectura publica" on productos;
create policy "productos: lectura publica"
  on productos for select
  using (true);

-- Solo un usuario logueado (vos, desde el panel admin) puede editar productos
drop policy if exists "productos: escritura solo admin" on productos;
create policy "productos: escritura solo admin"
  on productos for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Cualquiera puede CREAR un pedido (el cliente, al hacer checkout)
drop policy if exists "pedidos: crear publico" on pedidos;
create policy "pedidos: crear publico"
  on pedidos for insert
  with check (true);

-- Solo un usuario logueado puede VER o EDITAR los pedidos (vos, desde el panel admin)
drop policy if exists "pedidos: lectura y edicion solo admin" on pedidos;
create policy "pedidos: lectura y edicion solo admin"
  on pedidos for select
  using (auth.role() = 'authenticated');

drop policy if exists "pedidos: actualizar solo admin" on pedidos;
create policy "pedidos: actualizar solo admin"
  on pedidos for update
  using (auth.role() = 'authenticated');
