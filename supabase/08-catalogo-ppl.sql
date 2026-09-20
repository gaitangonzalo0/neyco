-- ============================================================
-- CATÁLOGO PPL (Personas Privadas de su Libertad): renombramos
-- la bandera que habíamos llamado "delivery" (ese nombre ya lo usa
-- la tienda general para otra cosa) y sumamos un precio propio,
-- editable, independiente del precio de la tienda general.
-- Pegar en Supabase → SQL Editor → Run. Seguro de correr más de una vez.
-- ============================================================

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'productos' and column_name = 'disponible_delivery'
  ) and not exists (
    select 1 from information_schema.columns
    where table_name = 'productos' and column_name = 'disponible_ppl'
  ) then
    alter table productos rename column disponible_delivery to disponible_ppl;
  end if;
end $$;

alter table productos
  add column if not exists disponible_ppl boolean not null default false;

alter table productos
  add column if not exists precio_ppl integer;
  -- si es null, en la página /reclusos se usa el precio general del producto
