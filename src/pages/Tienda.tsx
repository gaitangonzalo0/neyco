import React, { useState, useEffect, useMemo } from "react";
import { ShoppingBag, Plus, Minus, Copy, Check, MessageCircle, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import type { Producto, DatosEntrega, ItemPedido, ResultadoCrearPedido, Configuracion, Modalidad } from "../types";

const NEGOCIO = {
  nombre: "neyco",
  tagline: "AUTOSERVICIO",
  subtitulo: "ALMACÉN · KIOSCO",
  whatsapp: "5492213050025",
  cbu: "0000003100003953051345",
  alias: "super.neyco",
  titular: "Thiago Joaquín Urueña",
};

const NEGRO = "#0E0D0B";
const NEGRO_SUAVE = "#18160F";
const DORADO = "#D9A441";
const CREMA = "#F3EEDF";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

type Vista = "catalogo" | "carrito" | "datos" | "checkout" | "confirmado";

interface CartLine {
  key: string;
  productoId: number;
  varianteId: number | null;
  nombre: string;
  foto: string | null;
  emoji: string | null;
  precioBase: number;
  stockDisponible: number;
  qty: number;
}

export default function Tienda() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [configuracion, setConfiguracion] = useState<Configuracion | null>(null);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true);
  const [modalidad, setModalidad] = useState<Modalidad | null>(null);
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [categoria, setCategoria] = useState("Todos");
  const [vista, setVista] = useState<Vista>("catalogo");
  const [copiado, setCopiado] = useState(false);
  const [orden, setOrden] = useState<string | null>(null);
  const [entrega, setEntrega] = useState<DatosEntrega>({ nombre: "", modo: "retira", direccion: "", telefono: "" });
  const [guardandoPedido, setGuardandoPedido] = useState(false);
  const [errorPedido, setErrorPedido] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<number | null>(null);

  useEffect(() => {
    cargarCatalogo();
    cargarConfiguracion();
  }, []);

  async function cargarCatalogo() {
    setCargandoCatalogo(true);
    const { data, error } = await supabase
      .from("productos")
      .select("*, producto_variantes(*)")
      .order("categoria")
      .order("nombre");
    if (!error && data) {
      const conVariantes = (data as any[]).map((p) => ({ ...p, variantes: p.producto_variantes || [] }));
      setProductos(conVariantes as Producto[]);
    }
    setCargandoCatalogo(false);
  }

  async function cargarConfiguracion() {
    const { data } = await supabase.from("configuracion").select("*").eq("id", 1).single();
    if (data) setConfiguracion(data as Configuracion);
  }

  function precioFinal(base: number): number {
    if (modalidad === "delivery" && configuracion?.usar_precios_diferenciados) {
      return Math.round((base * (1 + configuracion.recargo_delivery_porcentaje / 100)) / 10) * 10;
    }
    return base;
  }

  function elegirModalidad(m: Modalidad) {
    setModalidad(m);
    setCategoria("Todos");
    setEntrega((e) => ({ ...e, modo: m === "delivery" ? "envio" : "retira" }));
  }

  const categorias = useMemo(
    () => ["Todos", ...Array.from(new Set(productos.map((p) => p.categoria)))],
    [productos]
  );
  const productosFiltrados = useMemo(
    () => (categoria === "Todos" ? productos : productos.filter((p) => p.categoria === categoria)),
    [categoria, productos]
  );

  const lineasCarrito = Object.values(cart).filter((l) => l.qty > 0);
  const totalItems = lineasCarrito.reduce((acc, l) => acc + l.qty, 0);
  const total = lineasCarrito.reduce((acc, l) => acc + l.qty * precioFinal(l.precioBase), 0);

  function agregarLinea(producto: Producto, varianteId: number | null, nombreLinea: string, precioBase: number, stockDisponible: number) {
    const key = varianteId ? `${producto.id}:${varianteId}` : `${producto.id}`;
    setCart((c) => {
      const actual = c[key]?.qty || 0;
      if (actual >= stockDisponible) return c;
      return {
        ...c,
        [key]: {
          key, productoId: producto.id, varianteId, nombre: nombreLinea,
          foto: producto.foto, emoji: producto.emoji, precioBase, stockDisponible, qty: actual + 1,
        },
      };
    });
  }
  function restarLinea(key: string) {
    setCart((c) => {
      if (!c[key]) return c;
      const nuevaQty = Math.max(0, c[key].qty - 1);
      return { ...c, [key]: { ...c[key], qty: nuevaQty } };
    });
  }

  function irADatosEntrega() {
    setVista("datos");
  }

  async function irACheckout() {
    const numeroOrden = `N-${Date.now().toString().slice(-6)}`;
    setGuardandoPedido(true);
    setErrorPedido(null);

    const items: (ItemPedido & { variante_id: number | null })[] = lineasCarrito.map((l) => ({
      id: l.productoId,
      variante_id: l.varianteId,
      nombre: l.nombre,
      cantidad: l.qty,
      precio: precioFinal(l.precioBase),
    }));

    const { data, error } = await supabase.rpc("crear_pedido", {
      p_numero_orden: numeroOrden,
      p_cliente_nombre: entrega.nombre,
      p_modo_entrega: entrega.modo,
      p_direccion: entrega.modo === "envio" ? entrega.direccion : null,
      p_telefono: entrega.telefono,
      p_items: items,
      p_total: total,
      p_modalidad: modalidad,
    });

    setGuardandoPedido(false);

    if (error) {
      setErrorPedido("No se pudo conectar con el sistema. Intentá de nuevo en un momento.");
      return;
    }

    const resultado = data as ResultadoCrearPedido;
    if (!resultado.ok) {
      if (resultado.error === "sin_stock") {
        setErrorPedido(`"${resultado.producto}" ya no tiene stock suficiente (quedan ${resultado.stock_disponible}). Ajustá el carrito.`);
      } else {
        setErrorPedido(`"${resultado.producto}" ya no está disponible.`);
      }
      cargarCatalogo();
      return;
    }

    setOrden(resultado.numero_orden);
    setVista("checkout");
    cargarCatalogo();
  }

  function actualizarEntrega(campo: keyof DatosEntrega, valor: string) {
    setEntrega((e) => ({ ...e, [campo]: valor }));
  }

  async function copiarCBU() {
    try {
      await navigator.clipboard.writeText(NEGOCIO.cbu);
    } catch {
      /* noop */
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function mensajeWhatsapp() {
    const detalle = lineasCarrito.map((l) => `- ${l.qty}x ${l.nombre}`).join("\n");
    const lineaEntrega = entrega.modo === "envio" ? `Envío a: ${entrega.direccion || "(sin especificar)"}` : "Retira en el local";
    const texto =
      `Hola! Te paso el comprobante de mi pedido.\n\n` +
      `Número de orden: ${orden}\n` +
      `Modalidad: ${modalidad === "delivery" ? "Delivery" : "Take away"}\n` +
      `Nombre: ${entrega.nombre || "(sin nombre)"}\n` +
      `${lineaEntrega}\n` +
      `Teléfono de contacto: ${entrega.telefono || "(sin teléfono)"}\n\n` +
      `Pedido:\n${detalle}\n\n` +
      `Total: ${fmt(total)}`;
    return `https://wa.me/${NEGOCIO.whatsapp}?text=${encodeURIComponent(texto)}`;
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: NEGRO, minHeight: "100vh", color: CREMA }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        .logo-font { font-family: 'Baloo 2', sans-serif; }
        * { box-sizing: border-box; }
        .app-shell { max-width: 1200px; margin: 0 auto; }
        .catalogo-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        @media (min-width: 640px) { .catalogo-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 1024px) { .catalogo-grid { grid-template-columns: repeat(5, 1fr); } }
        .producto-card { transition: border-color 0.15s ease, transform 0.15s ease; }
        .producto-card:hover { border-color: #D9A441 !important; transform: translateY(-2px); }
      `}</style>

      <div className="app-shell">
        <div style={{ padding: "26px 16px 16px", textAlign: "center", borderBottom: `1px solid ${DORADO}33` }}>
          <div className="logo-font" style={{ fontSize: 34, fontWeight: 800, color: DORADO, lineHeight: 1 }}>
            {NEGOCIO.nombre}
          </div>
          <div style={{ fontSize: 11, letterSpacing: 3, color: CREMA, opacity: 0.85, marginTop: 8 }}>— {NEGOCIO.tagline} —</div>
          <div style={{ fontSize: 10.5, letterSpacing: 2, color: DORADO, opacity: 0.9, marginTop: 4 }}>{NEGOCIO.subtitulo}</div>

          {modalidad && (
            <div style={{ marginTop: 10, fontSize: 11, opacity: 0.7 }}>
              Pediste: <strong style={{ color: DORADO }}>{modalidad === "delivery" ? "Delivery" : "Take away"}</strong>{" "}
              <button onClick={() => setModalidad(null)} style={{ background: "transparent", border: "none", color: DORADO, textDecoration: "underline", fontSize: 11, fontFamily: "inherit", padding: 0, marginLeft: 6 }}>
                cambiar
              </button>
            </div>
          )}
        </div>

        {modalidad === null && <SelectorModalidad onElegir={elegirModalidad} />}

        {modalidad !== null && (
          <>
            {vista === "catalogo" && (
              <div style={{ padding: "14px 12px 90px" }}>
                <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10 }}>
                  {categorias.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCategoria(c)}
                      style={{
                        flexShrink: 0, padding: "6px 14px", borderRadius: 999, border: `1.5px solid ${DORADO}`,
                        background: categoria === c ? DORADO : "transparent", color: categoria === c ? NEGRO : DORADO,
                        fontSize: 12.5, fontWeight: 600, fontFamily: "inherit",
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                {cargandoCatalogo && <div style={{ opacity: 0.6, fontSize: 13, marginTop: 20 }}>Cargando catálogo...</div>}

                <div className="catalogo-grid" style={{ marginTop: 8 }}>
                  {productosFiltrados.map((p) => (
                    <TarjetaProducto
                      key={p.id}
                      producto={p}
                      cart={cart}
                      expandido={expandido === p.id}
                      onToggleExpandir={() => setExpandido(expandido === p.id ? null : p.id)}
                      precioFinal={precioFinal}
                      onAgregar={agregarLinea}
                      onRestar={restarLinea}
                    />
                  ))}
                </div>
              </div>
            )}

            {vista === "carrito" && (
              <CarritoView lineas={lineasCarrito} total={total} precioFinal={precioFinal} onSumar={agregarLinea} onRestar={restarLinea} productos={productos} onVolver={() => setVista("catalogo")} onCheckout={irADatosEntrega} />
            )}

            {vista === "datos" && (
              <DatosEntregaView modalidad={modalidad} entrega={entrega} onCambiar={actualizarEntrega} onVolver={() => setVista("carrito")} onContinuar={irACheckout} />
            )}

            {vista === "checkout" && (
              <CheckoutView
                orden={orden} total={total} negocio={NEGOCIO} copiado={copiado}
                onCopiar={copiarCBU} mensajeWhatsapp={mensajeWhatsapp}
                guardandoPedido={guardandoPedido} errorPedido={errorPedido}
                onVolver={() => setVista("datos")} onConfirmado={() => setVista("confirmado")}
              />
            )}

            {vista === "confirmado" && (
              <ConfirmadoView orden={orden} onNuevoPedido={() => { setCart({}); setVista("catalogo"); }} />
            )}

            {vista === "catalogo" && totalItems > 0 && (
              <div onClick={() => setVista("carrito")} style={{ position: "fixed", left: 12, right: 12, bottom: 12, maxWidth: 1176, margin: "0 auto", background: DORADO, color: NEGRO, borderRadius: 12, padding: "13px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 6px 18px rgba(0,0,0,0.45)", fontWeight: 700, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <ShoppingBag size={18} /> {totalItems} {totalItems === 1 ? "producto" : "productos"}
                </div>
                <div>{fmt(total)}</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SelectorModalidad({ onElegir }: { onElegir: (m: Modalidad) => void }) {
  return (
    <div style={{ padding: "50px 20px", textAlign: "center" }}>
      <div className="logo-font" style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>¿Cómo querés recibir tu pedido?</div>
      <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
        <button onClick={() => onElegir("delivery")} style={botonModalidad}>
          <div style={{ fontSize: 30 }}>🛵</div>
          <div style={{ fontWeight: 700, marginTop: 6 }}>Delivery</div>
        </button>
        <button onClick={() => onElegir("takeaway")} style={botonModalidad}>
          <div style={{ fontSize: 30 }}>🛍️</div>
          <div style={{ fontWeight: 700, marginTop: 6 }}>Take away</div>
        </button>
      </div>
    </div>
  );
}

const botonModalidad: React.CSSProperties = {
  background: NEGRO_SUAVE, border: `1.5px solid ${DORADO}`, borderRadius: 12, padding: "22px 30px",
  color: CREMA, fontFamily: "inherit", cursor: "pointer", minWidth: 130,
};

const btnIcon: React.CSSProperties = { background: "transparent", border: "none", padding: 4, display: "flex", alignItems: "center", justifyContent: "center" };

function TarjetaProducto({ producto, cart, expandido, onToggleExpandir, precioFinal, onAgregar, onRestar }: {
  producto: Producto;
  cart: Record<string, CartLine>;
  expandido: boolean;
  onToggleExpandir: () => void;
  precioFinal: (base: number) => number;
  onAgregar: (producto: Producto, varianteId: number | null, nombreLinea: string, precioBase: number, stockDisponible: number) => void;
  onRestar: (key: string) => void;
}) {
  const tieneVariantes = (producto.variantes?.length || 0) > 0;
  const agotadoBase = !tieneVariantes && producto.stock <= 0;
  const keyBase = `${producto.id}`;
  const qtyBase = cart[keyBase]?.qty || 0;

  return (
    <div className="producto-card" style={{ background: NEGRO_SUAVE, border: `1px solid ${DORADO}22`, borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 6, opacity: agotadoBase ? 0.55 : 1 }}>
      {producto.foto ? (
        <img src={producto.foto} alt={producto.nombre} style={{ width: "100%", height: 84, objectFit: "contain", borderRadius: 6, background: "#0000001A" }} />
      ) : (
        <div style={{ fontSize: 34, lineHeight: 1 }}>{producto.emoji || "📦"}</div>
      )}
      <div style={{ fontSize: 13.5, fontWeight: 600, minHeight: 34, color: CREMA }}>{producto.nombre}</div>
      {!tieneVariantes && <div style={{ fontSize: 15, fontWeight: 700, color: DORADO }}>{fmt(precioFinal(producto.precio))}</div>}

      {tieneVariantes ? (
        <>
          <button
            onClick={onToggleExpandir}
            style={{ marginTop: 4, background: "transparent", border: `1.5px solid ${DORADO}`, color: DORADO, borderRadius: 7, padding: "7px 0", fontSize: 12, fontWeight: 700, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
          >
            Elegir sabor {expandido ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {expandido && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
              {producto.variantes!.map((v) => {
                const key = `${producto.id}:${v.id}`;
                const qty = cart[key]?.qty || 0;
                const agotado = v.stock <= 0;
                const precioBase = v.precio ?? producto.precio;
                return (
                  <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5 }}>
                    <div style={{ flex: 1, opacity: agotado ? 0.5 : 1 }}>
                      {v.nombre} · {fmt(precioFinal(precioBase))} {agotado && <span style={{ color: "#E8776A" }}>(agotado)</span>}
                    </div>
                    {!agotado && (
                      qty === 0 ? (
                        <button onClick={() => onAgregar(producto, v.id, `${producto.nombre} (${v.nombre})`, precioBase, v.stock)} style={{ background: DORADO, color: NEGRO, border: "none", borderRadius: 5, padding: "3px 7px", fontFamily: "inherit" }}>
                          <Plus size={12} />
                        </button>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, background: DORADO, borderRadius: 5, padding: "1px 4px" }}>
                          <button onClick={() => onRestar(key)} style={btnIcon}><Minus size={11} color={NEGRO} /></button>
                          <span style={{ color: NEGRO, fontWeight: 800, fontSize: 11 }}>{qty}</span>
                          <button onClick={() => onAgregar(producto, v.id, `${producto.nombre} (${v.nombre})`, precioBase, v.stock)} style={btnIcon}><Plus size={11} color={NEGRO} /></button>
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : agotadoBase ? (
        <div style={{ textAlign: "center", fontSize: 11.5, fontWeight: 700, color: "#E8776A", padding: "8px 0" }}>AGOTADO</div>
      ) : qtyBase === 0 ? (
        <button onClick={() => onAgregar(producto, null, producto.nombre, producto.precio, producto.stock)} style={{ marginTop: 4, background: DORADO, color: NEGRO, border: "none", borderRadius: 7, padding: "8px 0", fontSize: 12.5, fontWeight: 700, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          <Plus size={14} /> Agregar
        </button>
      ) : (
        <div style={{ marginTop: 4, display: "flex", alignItems: "center", justifyContent: "space-between", background: DORADO, borderRadius: 7, padding: "4px 6px" }}>
          <button onClick={() => onRestar(keyBase)} style={btnIcon}><Minus size={14} color={NEGRO} /></button>
          <span style={{ color: NEGRO, fontWeight: 800, fontSize: 14 }}>{qtyBase}</span>
          <button onClick={() => onAgregar(producto, null, producto.nombre, producto.precio, producto.stock)} style={btnIcon}><Plus size={14} color={NEGRO} /></button>
        </div>
      )}
    </div>
  );
}

function CarritoView({ lineas, total, precioFinal, onSumar, onRestar, productos, onVolver, onCheckout }: {
  lineas: CartLine[]; total: number; precioFinal: (base: number) => number;
  onSumar: (producto: Producto, varianteId: number | null, nombreLinea: string, precioBase: number, stockDisponible: number) => void;
  onRestar: (key: string) => void; productos: Producto[];
  onVolver: () => void; onCheckout: () => void;
}) {
  return (
    <div style={{ padding: "14px 14px 100px" }}>
      <button onClick={onVolver} style={linkBtn}><ArrowLeft size={16} /> Seguir viendo el catálogo</button>
      <div className="logo-font" style={{ fontSize: 19, fontWeight: 700, margin: "12px 0 10px" }}>Tu pedido</div>
      {lineas.length === 0 && <div style={{ fontSize: 13.5, opacity: 0.7 }}>Todavía no agregaste productos.</div>}
      {lineas.map((l) => {
        const producto = productos.find((p) => p.id === l.productoId);
        return (
          <div key={l.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px dashed #12403A44" }}>
            {l.foto ? (
              <img src={l.foto} alt={l.nombre} style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 5, background: "#0000001A" }} />
            ) : (
              <div style={{ fontSize: 26 }}>{l.emoji || "📦"}</div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{l.nombre}</div>
              <div style={{ fontSize: 12.5, opacity: 0.7 }}>{fmt(precioFinal(l.precioBase))} c/u</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: DORADO, borderRadius: 7, padding: "4px 8px" }}>
              <button onClick={() => onRestar(l.key)} style={btnIcon}><Minus size={13} color={NEGRO} /></button>
              <span style={{ color: NEGRO, fontWeight: 700, fontSize: 13 }}>{l.qty}</span>
              {producto && (
                <button onClick={() => onSumar(producto, l.varianteId, l.nombre, l.precioBase, l.stockDisponible)} style={btnIcon}><Plus size={13} color={NEGRO} /></button>
              )}
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 700, width: 68, textAlign: "right" }}>{fmt(l.qty * precioFinal(l.precioBase))}</div>
          </div>
        );
      })}
      {lineas.length > 0 && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, fontSize: 16, fontWeight: 700 }}>
            <span>Total</span><span>{fmt(total)}</span>
          </div>
          <button onClick={onCheckout} style={{ marginTop: 16, width: "100%", background: DORADO, color: NEGRO, border: "none", borderRadius: 9, padding: "13px 0", fontWeight: 700, fontSize: 14.5, fontFamily: "inherit" }}>
            Continuar
          </button>
        </>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", background: "#0000002A", border: `1px solid ${DORADO}44`, borderRadius: 8, padding: "10px 12px", color: CREMA, fontFamily: "'Inter', sans-serif", fontSize: 13.5, outline: "none" };

function DatosEntregaView({ modalidad, entrega, onCambiar, onVolver, onContinuar }: {
  modalidad: Modalidad; entrega: DatosEntrega; onCambiar: (campo: keyof DatosEntrega, valor: string) => void;
  onVolver: () => void; onContinuar: () => void;
}) {
  const puedeContinuar = entrega.nombre.trim().length > 0 && entrega.telefono.trim().length > 0 && (modalidad === "takeaway" || entrega.direccion.trim().length > 0);

  return (
    <div style={{ padding: "14px 14px 40px" }}>
      <button onClick={onVolver} style={linkBtn}><ArrowLeft size={16} /> Volver al pedido</button>
      <div className="logo-font" style={{ fontSize: 19, fontWeight: 700, margin: "12px 0 14px" }}>Tus datos</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={{ fontSize: 11.5, opacity: 0.65, display: "block", marginBottom: 5 }}>Nombre y apellido</label>
          <input style={inputStyle} value={entrega.nombre} onChange={(e) => onCambiar("nombre", e.target.value)} placeholder="Ej. Juan Pérez" />
        </div>
        {modalidad === "delivery" && (
          <div>
            <label style={{ fontSize: 11.5, opacity: 0.65, display: "block", marginBottom: 5 }}>Dirección de entrega</label>
            <input style={inputStyle} value={entrega.direccion} onChange={(e) => onCambiar("direccion", e.target.value)} placeholder="Calle, número y barrio" />
          </div>
        )}
        <div>
          <label style={{ fontSize: 11.5, opacity: 0.65, display: "block", marginBottom: 5 }}>Teléfono de contacto</label>
          <input style={inputStyle} value={entrega.telefono} onChange={(e) => onCambiar("telefono", e.target.value)} placeholder="Ej. 3764123456" />
        </div>
      </div>
      <button onClick={onContinuar} disabled={!puedeContinuar} style={{ marginTop: 20, width: "100%", background: puedeContinuar ? DORADO : `${DORADO}55`, color: NEGRO, border: "none", borderRadius: 9, padding: "13px 0", fontWeight: 700, fontSize: 14.5, fontFamily: "inherit", cursor: puedeContinuar ? "pointer" : "not-allowed" }}>
        Ir a pagar
      </button>
    </div>
  );
}

function CheckoutView({ orden, total, negocio, copiado, onCopiar, mensajeWhatsapp, guardandoPedido, errorPedido, onVolver, onConfirmado }: {
  orden: string | null; total: number; negocio: typeof NEGOCIO; copiado: boolean;
  onCopiar: () => void; mensajeWhatsapp: () => string;
  guardandoPedido: boolean; errorPedido: string | null;
  onVolver: () => void; onConfirmado: () => void;
}) {
  if (guardandoPedido) {
    return <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: DORADO }}>Confirmando tu pedido...</div>;
  }

  if (errorPedido) {
    return (
      <div style={{ padding: "14px 14px 40px" }}>
        <button onClick={onVolver} style={linkBtn}><ArrowLeft size={16} /> Volver al pedido</button>
        <div style={{ marginTop: 20, background: "#E8776A22", border: "1.5px solid #E8776A", borderRadius: 10, padding: 16, fontSize: 13.5, color: "#F3EEDF" }}>
          {errorPedido}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "14px 14px 40px" }}>
      <button onClick={onVolver} style={linkBtn}><ArrowLeft size={16} /> Volver al pedido</button>
      <div className="logo-font" style={{ fontSize: 19, fontWeight: 700, margin: "12px 0 10px" }}>Transferí para completar tu pedido</div>

      <div style={{ background: `${DORADO}18`, border: `1.5px solid ${DORADO}`, borderRadius: 10, padding: "12px 14px", marginBottom: 16, textAlign: "center" }}>
        <div style={{ fontSize: 12, opacity: 0.75, letterSpacing: 1 }}>NÚMERO DE ORDEN</div>
        <div className="logo-font" style={{ fontSize: 28, fontWeight: 800, color: DORADO, letterSpacing: 1 }}>{orden}</div>
        <div style={{ fontSize: 12.5, opacity: 0.75, marginTop: 2 }}>Guardá este número, lo vas a necesitar</div>
      </div>

      <div style={{ background: NEGRO_SUAVE, border: `1px solid ${DORADO}33`, borderRadius: 10, padding: 14 }}>
        <Campo label="Alias" valor={negocio.alias} />
        <Campo label="CBU" valor={negocio.cbu} />
        <Campo label="Titular" valor={negocio.titular} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTop: `1px solid ${DORADO}33` }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Monto a transferir</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: DORADO }}>{fmt(total)}</span>
        </div>
      </div>

      <button onClick={onCopiar} style={{ marginTop: 12, width: "100%", background: "transparent", border: `1.5px solid ${DORADO}`, color: DORADO, borderRadius: 9, padding: "11px 0", fontWeight: 600, fontSize: 13.5, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
        {copiado ? <Check size={16} /> : <Copy size={16} />} {copiado ? "CBU copiado" : "Copiar CBU"}
      </button>

      <div style={{ fontSize: 14.5, fontWeight: 600, color: CREMA, lineHeight: 1.4, margin: "18px 0 12px", textAlign: "center" }}>
        Una vez que transferís, mandanos el comprobante de pago por WhatsApp junto con tu número de orden para confirmar el pedido.
      </div>

      <a href={mensajeWhatsapp()} target="_blank" rel="noreferrer" onClick={onConfirmado} style={{ width: "100%", background: DORADO, color: NEGRO, border: "none", borderRadius: 9, padding: "13px 0", fontWeight: 700, fontSize: 14.5, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, textDecoration: "none" }}>
        <MessageCircle size={18} /> Enviar comprobante por WhatsApp
      </a>
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
      <span style={{ opacity: 0.55 }}>{label}</span><span style={{ fontWeight: 600 }}>{valor}</span>
    </div>
  );
}

function ConfirmadoView({ orden, onNuevoPedido }: { orden: string | null; onNuevoPedido: () => void }) {
  return (
    <div style={{ padding: "40px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 42 }}>✅</div>
      <div className="logo-font" style={{ fontSize: 19, fontWeight: 700, marginTop: 10 }}>¡Listo! Pedido enviado</div>
      <div style={{ fontSize: 13, opacity: 0.65, marginTop: 6 }}>Orden N° <strong>{orden}</strong>. En breve te van a confirmar por WhatsApp.</div>
      <button onClick={onNuevoPedido} style={{ marginTop: 20, background: DORADO, color: NEGRO, border: "none", borderRadius: 9, padding: "11px 20px", fontWeight: 700, fontSize: 13.5, fontFamily: "inherit" }}>
        Hacer otro pedido
      </button>
    </div>
  );
}

const linkBtn: React.CSSProperties = { background: "transparent", border: "none", color: "#D9A441", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, padding: 0 };
