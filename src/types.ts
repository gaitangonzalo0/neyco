export interface Producto {
  id: number;
  nombre: string;
  categoria: string;
  tamano: string | null;
  precio: number;
  foto: string | null;
  emoji: string | null;
  stock: number;
  necesita_reposicion: boolean;
  disponible_ppl: boolean;
  precio_ppl: number | null; // precio propio para el canal PPL; si es null, se usa "precio"
  variantes?: Variante[];
}

export interface Variante {
  id: number;
  producto_id: number;
  nombre: string;
  stock: number;
  precio: number | null; // si es null, se usa el precio del producto base
}

export interface ItemPedido {
  id: number;
  variante_id: number | null;
  nombre: string;
  cantidad: number;
  precio: number;
}

export type ModoEntrega = "retira" | "envio";
export type EstadoPedido = "pendiente" | "confirmado" | "entregado";
export type Modalidad = "delivery" | "takeaway";

export interface Configuracion {
  id: number;
  usar_precios_diferenciados: boolean;
  recargo_delivery_porcentaje: number;
}

export interface Pedido {
  id: number;
  numero_orden: string;
  cliente_nombre: string;
  modo_entrega: ModoEntrega;
  direccion: string | null;
  telefono: string;
  items: ItemPedido[];
  total: number;
  estado: EstadoPedido;
  modalidad: Modalidad | null;
  creado_en: string;
}

export interface MovimientoStock {
  id: number;
  producto_id: number | null;
  producto_nombre: string;
  tipo: "entrada" | "salida";
  cantidad: number;
  motivo: string | null;
  creado_en: string;
}

export interface DatosEntrega {
  nombre: string;
  modo: ModoEntrega;
  direccion: string;
  telefono: string;
}

/** Resultado de la función atómica crear_pedido() en Supabase */
export type ResultadoCrearPedido =
  | { ok: true; pedido_id: number; numero_orden: string }
  | { ok: false; error: "sin_stock"; producto: string; stock_disponible: number }
  | { ok: false; error: "producto_no_encontrado"; producto: string };
