import React, { useState, useEffect, useMemo } from "react";
import { ShoppingBag, Plus, Minus, Copy, Check, MessageCircle, ArrowLeft } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import type { Producto, DatosEntrega, ItemPedido, ResultadoCrearPedido } from "../types";

/* ============================================================
   Página PPL (Personas Privadas de su Libertad).
   A propósito más simple que la tienda general:
   - Sin selector de modalidad ni recargo de precio.
   - Catálogo restringido a productos con disponible_ppl = true.
   - Precio propio por producto (precio_ppl), si está cargado;
     si no, usa el precio general del producto.
   - v1: no maneja variantes (sabores/tamaños) todavía — si un
     producto habilitado acá tiene variantes, se ignoran y se
     vende como producto único al precio_ppl / precio general.
   Lo estético queda para el tramo final, según lo acordado.
   ============================================================ */

const NEGOCIO = {
  nombre: "neyco",
  tagline: "AUTOSERVICIO",
  subtitulo: "CATÁLOGO PPL",
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

export default function TiendaPPL() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [categoria, setCategoria] = useState("Todos");
  const [vista, setVista] = useState<Vista>("catalogo");
  const [copiado, setCopiado] = useState(false);
  const [orden, setOrden] = useState<string | null>(null);
  const [entrega, setEntrega] = useState<DatosEntrega>({ nombre: "", modo: "envio", direccion: "", telefono: "" });
  const [guardandoPedido, setGuardandoPedido] = useState(false);
  const [errorPedido, setErrorPedido] = useState<string | null>(null);

  useEffect(() => {
    cargarCatalogo();
  }, []);

  async function cargarCatalogo() {
    setCargandoCatalogo(true);
    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .eq("disponible_ppl", true)
      .order("categoria")
      .order("nombre");
    if (!error && data) setProductos(data as Producto[]);
    setCargandoCatalogo(false);
  }

  function precioMostrado(p: Producto): number {
    return p.precio_ppl ?? p.precio;
  }

  const categorias = useMemo(() => ["Todos", ...Array.from(new Set(productos.map((p) => p.categoria)))], [productos]);
  const productosFiltrados = useMemo(
    () => (categoria === "Todos" ? productos : productos.filter((p) => p.categoria === categoria)),
    [categoria, productos]
  );

  const itemsCarrito = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => {
          const producto = productos.find((p) => p.id === Number(id))!;
          return { ...producto, qty };
        }),
    [cart, productos]
  );

  const totalItems = itemsCarrito.reduce((acc, i) => acc + i.qty, 0);
  const total = itemsCarrito.reduce((acc, i) => acc + i.qty * precioMostrado(i), 0);

  function sumar(id: number) {
    const producto = productos.find((p) => p.id === id);
    if (!producto) return;
    setCart((c) => {
      const actual = c[id] || 0;
      if (actual >= producto.stock) return c;
      return { ...c, [id]: actual + 1 };
    });
  }
  function restar(id: number) {
    setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] || 0) - 1) }));
  }

  function irADatosEntrega() {
    setVista("datos");
  }

  async function irACheckout() {
    const numeroOrden = `P-${Date.now().toString().slice(-6)}`;
    setGuardandoPedido(true);
    setErrorPedido(null);

    const items: ItemPedido[] = itemsCarrito.map((i) => ({
      id: i.id, variante_id: null, nombre: i.nombre, cantidad: i.qty, precio: precioMostrado(i),
    }));

    const { data, error } = await supabase.rpc("crear_pedido", {
      p_numero_orden: numeroOrden,
      p_cliente_nombre: entrega.nombre,
      p_modo_entrega: "envio",
      p_direccion: entrega.direccion,
      p_telefono: entrega.telefono,
      p_items: items,
      p_total: total,
      p_modalidad: "ppl",
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
    const detalle = itemsCarrito.map((i) => `- ${i.qty}x ${i.nombre}`).join("\n");
    const texto =
      `Hola! Te paso el comprobante de mi pedido (canal PPL).\n\n` +
      `Número de orden: ${orden}\n` +
      `Nombre: ${entrega.nombre || "(sin nombre)"}\n` +
      `Destino: ${entrega.direccion || "(sin especificar)"}\n` +
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
        .app-shell { max-width: 900px; margin: 0 auto; }
        .catalogo-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        @media (min-width: 640px) { .catalogo-grid { grid-template-columns: repeat(3, 1fr); } }
      `}</style>

      <div className="app-shell">
        <div style={{ padding: "26px 16px 16px", textAlign: "center", borderBottom: `1px solid ${DORADO}33` }}>
          <div className="logo-font" style={{ fontSize: 30, fontWeight: 800, color: DORADO, lineHeight: 1 }}>
            {NEGOCIO.nombre}
          </div>
          <div style={{ fontSize: 10.5, letterSpacing: 2, color: DORADO, opacity: 0.9, marginTop: 8 }}>{NEGOCIO.subtitulo}</div>
        </div>

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
            {!cargandoCatalogo && productos.length === 0 && (
              <div style={{ opacity: 0.6, fontSize: 13, marginTop: 20 }}>
                Todavía no hay productos habilitados para este canal. Marcalos desde el panel admin (ícono de camión).
              </div>
            )}

            <div className="catalogo-grid" style={{ marginTop: 8 }}>
              {productosFiltrados.map((p) => {
                const qty = cart[p.id] || 0;
                const agotado = p.stock <= 0;
                return (
                  <div key={p.id} style={{ background: NEGRO_SUAVE, border: `1px solid ${DORADO}22`, borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 6, opacity: agotado ? 0.55 : 1 }}>
                    {p.foto ? (
                      <img src={p.foto} alt={p.nombre} style={{ width: "100%", height: 84, objectFit: "contain", borderRadius: 6, background: "#0000001A" }} />
                    ) : (
                      <div style={{ fontSize: 34, lineHeight: 1 }}>{p.emoji || "📦"}</div>
                    )}
                    <div style={{ fontSize: 13.5, fontWeight: 600, minHeight: 34, color: CREMA }}>{p.nombre}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: DORADO }}>{fmt(precioMostrado(p))}</div>

                    {agotado ? (
                      <div style={{ textAlign: "center", fontSize: 11.5, fontWeight: 700, color: "#E8776A", padding: "8px 0" }}>AGOTADO</div>
                    ) : qty === 0 ? (
                      <button onClick={() => sumar(p.id)} style={{ marginTop: 4, background: DORADO, color: NEGRO, border: "none", borderRadius: 7, padding: "8px 0", fontSize: 12.5, fontWeight: 700, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                        <Plus size={14} /> Agregar
                      </button>
                    ) : (
                      <div style={{ marginTop: 4, display: "flex", alignItems: "center", justifyContent: "space-between", background: DORADO, borderRadius: 7, padding: "4px 6px" }}>
                        <button onClick={() => restar(p.id)} style={btnIcon}><Minus size={14} color={NEGRO} /></button>
                        <span style={{ color: NEGRO, fontWeight: 800, fontSize: 14 }}>{qty}</span>
                        <button onClick={() => sumar(p.id)} style={btnIcon}><Plus size={14} color={NEGRO} /></button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {vista === "carrito" && (
          <CarritoView itemsCarrito={itemsCarrito} total={total} precioMostrado={precioMostrado} sumar={sumar} restar={restar} onVolver={() => setVista("catalogo")} onCheckout={irADatosEntrega} />
        )}

        {vista === "datos" && (
          <DatosEntregaView entrega={entrega} onCambiar={actualizarEntrega} onVolver={() => setVista("carrito")} onContinuar={irACheckout} />
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
          <div onClick={() => setVista("carrito")} style={{ position: "fixed", left: 12, right: 12, bottom: 12, maxWidth: 876, margin: "0 auto", background: DORADO, color: NEGRO, borderRadius: 12, padding: "13px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 6px 18px rgba(0,0,0,0.45)", fontWeight: 700, cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ShoppingBag size={18} /> {totalItems} {totalItems === 1 ? "producto" : "productos"}
            </div>
            <div>{fmt(total)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

const btnIcon: React.CSSProperties = { background: "transparent", border: "none", padding: 4, display: "flex", alignItems: "center", justifyContent: "center" };

function CarritoView({ itemsCarrito, total, precioMostrado, sumar, restar, onVolver, onCheckout }: {
  itemsCarrito: (Producto & { qty: number })[]; total: number; precioMostrado: (p: Producto) => number;
  sumar: (id: number) => void; restar: (id: number) => void;
  onVolver: () => void; onCheckout: () => void;
}) {
  return (
    <div style={{ padding: "14px 14px 100px" }}>
      <button onClick={onVolver} style={linkBtn}><ArrowLeft size={16} /> Seguir viendo el catálogo</button>
      <div className="logo-font" style={{ fontSize: 19, fontWeight: 700, margin: "12px 0 10px" }}>Tu pedido</div>
      {itemsCarrito.length === 0 && <div style={{ fontSize: 13.5, opacity: 0.7 }}>Todavía no agregaste productos.</div>}
      {itemsCarrito.map((i) => (
        <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px dashed #12403A44" }}>
          {i.foto ? (
            <img src={i.foto} alt={i.nombre} style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 5, background: "#0000001A" }} />
          ) : (
            <div style={{ fontSize: 26 }}>{i.emoji || "📦"}</div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{i.nombre}</div>
            <div style={{ fontSize: 12.5, opacity: 0.7 }}>{fmt(precioMostrado(i))} c/u</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: DORADO, borderRadius: 7, padding: "4px 8px" }}>
            <button onClick={() => restar(i.id)} style={btnIcon}><Minus size={13} color={NEGRO} /></button>
            <span style={{ color: NEGRO, fontWeight: 700, fontSize: 13 }}>{i.qty}</span>
            <button onClick={() => sumar(i.id)} style={btnIcon}><Plus size={13} color={NEGRO} /></button>
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 700, width: 68, textAlign: "right" }}>{fmt(i.qty * precioMostrado(i))}</div>
        </div>
      ))}
      {itemsCarrito.length > 0 && (
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

function DatosEntregaView({ entrega, onCambiar, onVolver, onContinuar }: {
  entrega: DatosEntrega; onCambiar: (campo: keyof DatosEntrega, valor: string) => void;
  onVolver: () => void; onContinuar: () => void;
}) {
  const puedeContinuar = entrega.nombre.trim().length > 0 && entrega.telefono.trim().length > 0 && entrega.direccion.trim().length > 0;

  return (
    <div style={{ padding: "14px 14px 40px" }}>
      <button onClick={onVolver} style={linkBtn}><ArrowLeft size={16} /> Volver al pedido</button>
      <div className="logo-font" style={{ fontSize: 19, fontWeight: 700, margin: "12px 0 14px" }}>Tus datos</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={{ fontSize: 11.5, opacity: 0.65, display: "block", marginBottom: 5 }}>Nombre y apellido (quien encarga)</label>
          <input style={inputStyle} value={entrega.nombre} onChange={(e) => onCambiar("nombre", e.target.value)} placeholder="Ej. Juan Pérez" />
        </div>
        <div>
          {/* NOTA: etiqueta genérica a propósito — ajustar la terminología exacta
              (unidad / pabellón / interno, etc.) en el tramo de pulido final. */}
          <label style={{ fontSize: 11.5, opacity: 0.65, display: "block", marginBottom: 5 }}>Datos de destino</label>
          <input style={inputStyle} value={entrega.direccion} onChange={(e) => onCambiar("direccion", e.target.value)} placeholder="Unidad, pabellón, destinatario..." />
        </div>
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
