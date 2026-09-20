-- ============================================================
-- FUNCIÓN ATÓMICA: crear_pedido
-- Soluciona el problema de condición de carrera: dos clientes
-- comprando el último producto al mismo tiempo no pueden dejar
-- el stock en negativo, porque todo pasa en una sola transacción
-- del lado de Postgres, no en el navegador.
-- Pegar en Supabase → SQL Editor → Run
-- ============================================================

create or replace function crear_pedido(
  p_numero_orden text,
  p_cliente_nombre text,
  p_modo_entrega text,
  p_direccion text,
  p_telefono text,
  p_items jsonb,           -- [{ "id": 1, "nombre": "...", "cantidad": 2, "precio": 1500 }, ...]
  p_total integer
)
returns jsonb
language plpgsql
as $$
declare
  item jsonb;
  producto_actual productos%rowtype;
  nuevo_pedido_id bigint;
begin
  -- 1) Verificar stock de TODOS los items antes de tocar nada
  for item in select * from jsonb_array_elements(p_items)
  loop
    select * into producto_actual from productos where id = (item->>'id')::bigint for update;

    if not found then
      return jsonb_build_object('ok', false, 'error', 'producto_no_encontrado', 'producto', item->>'nombre');
    end if;

    if producto_actual.stock < (item->>'cantidad')::integer then
      return jsonb_build_object(
        'ok', false,
        'error', 'sin_stock',
        'producto', producto_actual.nombre,
        'stock_disponible', producto_actual.stock
      );
    end if;
  end loop;

  -- 2) Si todos tienen stock suficiente, ahora sí se descuenta cada uno
  for item in select * from jsonb_array_elements(p_items)
  loop
    update productos
      set stock = stock - (item->>'cantidad')::integer
      where id = (item->>'id')::bigint;
  end loop;

  -- 3) Se crea el pedido
  insert into pedidos (numero_orden, cliente_nombre, modo_entrega, direccion, telefono, items, total, estado)
  values (p_numero_orden, p_cliente_nombre, p_modo_entrega, p_direccion, p_telefono, p_items, p_total, 'pendiente')
  returning id into nuevo_pedido_id;

  return jsonb_build_object('ok', true, 'pedido_id', nuevo_pedido_id, 'numero_orden', p_numero_orden);
end;
$$;

-- Cualquiera puede ejecutar esta función (es la única forma en que
-- un cliente sin login puede crear un pedido y descontar stock)
grant execute on function crear_pedido to anon, authenticated;
