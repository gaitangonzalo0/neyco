-- ============================================================
-- CATÁLOGO DELIVERY (personas privadas de su libertad):
-- una bandera por producto, no una tabla aparte.
-- Un producto con disponible_delivery = true aparece en LAS DOS
-- modalidades (Delivery y Take away). Con false, solo en Take away.
-- Así el catálogo chico queda garantizado adentro del grande.
-- Pegar en Supabase → SQL Editor → Run
-- Seguro de correr más de una vez.
-- ============================================================

alter table productos
  add column if not exists disponible_delivery boolean not null default false;
