# neyco — tienda + panel admin

Proyecto Vite + React + TypeScript. Dos rutas dentro de la misma app:

- `/` → la tienda general (catálogo, carrito, checkout, con Delivery/Take Away)
- `/reclusos` → catálogo restringido para el canal PPL (Personas Privadas de su Libertad), con precio propio por producto
- `/admin` → el panel de gestión, maneja las dos tiendas desde el mismo lugar

## Cómo correrlo en tu compu (localhost)

```bash
npm install
cp .env.example .env      # completar con tu URL y anon key de Supabase (Settings → API)
npm run dev
```

Te va a quedar corriendo en `http://localhost:5173`. La tienda en `/`, el panel en `/admin`.

## Antes de correrlo por primera vez, correr en Supabase → SQL Editor

Todos los scripts están en la carpeta `supabase/`, numerados en el orden en que hay que correrlos.
Abrí cada uno con un editor de texto, copiá TODO su contenido (no el nombre del archivo) y pegalo en el SQL Editor de Supabase → Run, uno por uno, en orden:

1. `supabase/01-schema-supabase.sql` — tablas `productos` y `pedidos`
2. `supabase/02-schema-stock.sql` — tabla `movimientos_stock` + stock como cantidad
3. `supabase/03-migracion-productos.sql` — carga los 87 productos del catálogo
4. `supabase/04-migracion-fotos-y-faltantes.sql` — columnas `foto` / `necesita_reposicion` + fotos existentes (pesa ~900KB, puede tardar un poco en cargar y ejecutar — es normal, no lo cierres)
5. `supabase/05-crear_pedido.sql` — función atómica de descuento de stock (versión inicial)
6. `supabase/06-fase-2-3-4.sql` — variantes, configuración de precios, storage de fotos, y reemplaza `crear_pedido` por la versión que también entiende variantes
7. `supabase/07-catalogo-delivery.sql` — primera versión de la bandera (renombrada después en el paso 8)
8. `supabase/08-catalogo-ppl.sql` — renombra la bandera a `disponible_ppl` (para no confundirla con el Delivery de la tienda general) y suma `precio_ppl`, un precio propio por producto para ese canal

Si ya habías corrido alguno de estos en una sesión anterior de Supabase, no pasa nada por correrlo de nuevo — usan `if not exists` / `on conflict` para no romper nada.

## Qué se resolvió en esta versión (siguiendo las 4 fases acordadas)

### Fase 1 — Funcionamiento
- La tienda lee el catálogo real desde Supabase (antes tenía un array fijo con fotos incrustadas).
- El stock se descuenta de forma atómica en Postgres (función `crear_pedido`), no restando en React — dos compras simultáneas del último producto no pueden dejar stock negativo.
- Productos con `stock = 0` se muestran como "AGOTADO" y no se pueden agregar al carrito.

### Fase 2 — Administración
- CRUD de productos: crear, editar precio, eliminar, marcar como faltante.
- Subir/cambiar foto directo desde el admin (Supabase Storage, bucket `productos-fotos`) — tocando la imagen del producto se abre el selector de archivo.
- Variantes: cada producto puede tener sabores/tamaños propios, cada uno con su stock y (opcional) su propio precio. Se administran tocando el ícono de capas al lado del producto.

### Fase 3 — Catálogo
- Grilla responsive: 2 columnas en celular, 3 en tablet, 5 en pantallas grandes.
- Ancho máximo de página (1200px, centrado) para que no se estire feo en monitores grandes.
- Hover sutil en las tarjetas de producto (para uso en PC).
- Si un producto tiene variantes, no se agrega directo — se despliega "Elegir sabor" con cada opción y su propio stock.

### Fase 4 — Sistema comercial
- Al entrar a la tienda, el cliente elige Delivery o Take away antes de ver el catálogo.
- Si en `/admin → Configuración` activás "precios diferentes para delivery", los precios que ve el cliente se ajustan solos con el % de recargo que definas ahí (sin tocar código).
- La modalidad elegida queda guardada en cada pedido.

### Catálogo PPL — tercera página (en curso)
- Página nueva y separada: `/reclusos`. Más simple que la tienda general a propósito — sin selector de modalidad, sin recargo de precio.
- Cada producto tiene una bandera `disponible_ppl`: si está activa, aparece en `/reclusos` (y sigue apareciendo en `/` también, el catálogo chico vive adentro del grande).
- Cada producto puede tener un `precio_ppl` propio, editable desde el admin (aparece un input azul al lado del camión cuando el producto está habilitado). Si no se carga, usa el precio general.
- En `/admin → Productos`: el ícono de camión prende/apaga la disponibilidad en PPL, y hay filtros rápidos ("Todos" / "En PPL" / "Solo tienda general").
- Pendiente de ajustar en el tramo estético final: la etiqueta del campo "Datos de destino" en `/reclusos` es genérica a propósito — falta la terminología exacta que usa el sistema real (unidad, pabellón, etc.), y todavía no maneja variantes (sabores/tamaños) en ese canal.

## Verificado antes de entregarlo

- `npx tsc -b --noEmit` → 0 errores
- `npm run build` → compila y empaqueta sin errores (el aviso de "chunk grande" es normal por `recharts`, no rompe nada)
