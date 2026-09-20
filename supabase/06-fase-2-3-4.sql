-- ============================================================
-- FASES 2-4: variantes de producto, precios por modalidad
-- (delivery / take away), y storage para imágenes
-- Pegar en Supabase → SQL Editor → Run
-- (además de todo lo que ya corriste antes)
-- Seguro de correr más de una vez: no rompe nada si ya existe.
-- ============================================================

-- ------------------------------------------------------------
-- 1) VARIANTES: un producto puede tener sabores/tamaños propios,
--    cada uno con su propio stock y (opcionalmente) su propio precio
-- ------------------------------------------------------------
create table if not exists producto_variantes (
  id bigint primary key generated always as identity,
  producto_id bigint not null references productos(id) on delete cascade,
  nombre text not null,             -- ej: "Chocolate", "500ml"
  stock integer not null default 0,
  precio integer,                   -- si es null, se usa el precio del producto base
  creado_en timestamptz not null default now()
);

alter table producto_variantes enable row level security;

drop policy if exists "variantes: lectura publica" on producto_variantes;
create policy "variantes: lectura publica"
  on producto_variantes for select
  using (true);

drop policy if exists "variantes: escritura solo admin" on producto_variantes;
create policy "variantes: escritura solo admin"
  on producto_variantes for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- 2) CONFIGURACIÓN: precios diferenciados por modalidad de entrega
-- ------------------------------------------------------------
create table if not exists configuracion (
  id smallint primary key default 1,
  usar_precios_diferenciados boolean not null default false,
  recargo_delivery_porcentaje numeric not null default 0,
  constraint solo_una_fila check (id = 1)
);

insert into configuracion (id, usar_precios_diferenciados, recargo_delivery_porcentaje)
values (1, false, 0)
on conflict (id) do nothing;

alter table configuracion enable row level security;

drop policy if exists "configuracion: lectura publica" on configuracion;
create policy "configuracion: lectura publica"
  on configuracion for select
  using (true);

drop policy if exists "configuracion: escritura solo admin" on configuracion;
create policy "configuracion: escritura solo admin"
  on configuracion for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- 3) PEDIDOS: guardar qué modalidad eligió el cliente
-- ------------------------------------------------------------
alter table pedidos add column if not exists modalidad text;

-- ------------------------------------------------------------
-- 4) STORAGE: bucket público para las fotos de producto
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('productos-fotos', 'productos-fotos', true)
on conflict (id) do nothing;

drop policy if exists "fotos: lectura publica" on storage.objects;
create policy "fotos: lectura publica"
  on storage.objects for select
  using (bucket_id = 'productos-fotos');

drop policy if exists "fotos: solo admin sube/edita/borra" on storage.objects;
create policy "fotos: solo admin sube/edita/borra"
  on storage.objects for all
  using (bucket_id = 'productos-fotos' and auth.role() = 'authenticated')
  with check (bucket_id = 'productos-fotos' and auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- 5) crear_pedido: se reemplaza para soportar variantes.
--    Cada item ahora puede traer "variante_id" (o no).
--    Si lo trae, se descuenta el stock de esa variante puntual;
--    si no, se descuenta el stock del producto base. Todo sigue
--    siendo atómico (for update + una sola transacción).
-- ------------------------------------------------------------
drop function if exists crear_pedido(text, text, text, text, text, jsonb, integer);

create or replace function crear_pedido(
  p_numero_orden text,
  p_cliente_nombre text,
  p_modo_entrega text,
  p_direccion text,
  p_telefono text,
  p_items jsonb,           -- [{ id, variante_id (o null), nombre, cantidad, precio }, ...]
  p_total integer,
  p_modalidad text default null
)
returns jsonb
language plpgsql
as $$
declare
  item jsonb;
  v_variante_id bigint;
  stock_disponible integer;
  nuevo_pedido_id bigint;
begin
  -- 1) Verificar stock de TODOS los items antes de tocar nada
  for item in select * from jsonb_array_elements(p_items)
  loop
    v_variante_id := nullif(item->>'variante_id', '')::bigint;

    if v_variante_id is not null then
      select stock into stock_disponible from producto_variantes where id = v_variante_id for update;
    else
      select stock into stock_disponible from productos where id = (item->>'id')::bigint for update;
    end if;

    if stock_disponible is null then
      return jsonb_build_object('ok', false, 'error', 'producto_no_encontrado', 'producto', item->>'nombre');
    end if;

    if stock_disponible < (item->>'cantidad')::integer then
      return jsonb_build_object('ok', false, 'error', 'sin_stock', 'producto', item->>'nombre', 'stock_disponible', stock_disponible);
    end if;
  end loop;

  -- 2) Descontar
  for item in select * from jsonb_array_elements(p_items)
  loop
    v_variante_id := nullif(item->>'variante_id', '')::bigint;

    if v_variante_id is not null then
      update producto_variantes set stock = stock - (item->>'cantidad')::integer where id = v_variante_id;
    else
      update productos set stock = stock - (item->>'cantidad')::integer where id = (item->>'id')::bigint;
    end if;
  end loop;

  -- 3) Crear el pedido
  insert into pedidos (numero_orden, cliente_nombre, modo_entrega, direccion, telefono, items, total, estado, modalidad)
  values (p_numero_orden, p_cliente_nombre, p_modo_entrega, p_direccion, p_telefono, p_items, p_total, 'pendiente', p_modalidad)
  returning id into nuevo_pedido_id;

  return jsonb_build_object('ok', true, 'pedido_id', nuevo_pedido_id, 'numero_orden', p_numero_orden);
end;
$$;

grant execute on function crear_pedido to anon, authenticated;
