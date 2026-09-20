import React, { useState, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Producto, Pedido, MovimientoStock, Configuracion } from "../types";
import {
  LogOut, Menu, X, Search, Plus, Trash2, ChevronDown, ChevronUp,
  ClipboardList, Package, Boxes, LayoutDashboard, ArrowUpCircle, ArrowDownCircle, Bookmark, Check,
  Settings, Upload, Layers, Truck,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { supabase } from "../lib/supabaseClient";

const BLANCO = "#FFFFFF";
const SUPERFICIE = "#F7F5EF";
const TINTA = "#1C1A16";
const SIDEBAR_BG = "#14110A";
const DORADO = "#C08A2E";
const DORADO_CLARO = "#D9A441";
const VERDE = "#2F9E5B";
const ROJO = "#D64A3B";

const fmt = (n) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const inputStyle = {
  background: BLANCO,
  border: `1px solid ${TINTA}33`,
  borderRadius: 8,
  padding: "9px 11px",
  color: TINTA,
  fontFamily: "'Inter', sans-serif",
  fontSize: 13,
  outline: "none",
};

export default function AdminNeyco() {
  const [sesion, setSesion] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session);
      setCargando(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => setSesion(session));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (cargando) return null;

  return (
    <div style={{ minHeight: "100%", background: BLANCO, fontFamily: "'Inter', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');`}</style>
      {sesion ? <PanelAdmin /> : <LoginForm />}
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setEnviando(false);
    if (error) setError("Usuario o contraseña incorrectos.");
  }

  return (
    <div style={{ maxWidth: 340, margin: "0 auto", padding: "70px 20px" }}>
      <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: 24, fontWeight: 700, color: TINTA, textAlign: "center" }}>
        neyco <span style={{ color: DORADO }}>admin</span>
      </div>
      <div style={{ textAlign: "center", fontSize: 11.5, opacity: 0.55, marginBottom: 28, letterSpacing: 2 }}>PANEL DE GESTIÓN</div>

      <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
        <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
        {error && <div style={{ color: ROJO, fontSize: 13 }}>{error}</div>}
        <button type="submit" disabled={enviando} style={{ background: DORADO, color: "#fff", border: "none", borderRadius: 9, padding: "12px 0", fontWeight: 700, fontSize: 14, fontFamily: "inherit" }}>
          {enviando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}

function PanelAdmin() {
  const [vista, setVista] = useState("pedidos");
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoStock[]>([]);

  useEffect(() => {
    cargarProductos();
    cargarPedidos();
    cargarMovimientos();
  }, []);

  async function cargarProductos() {
    const { data } = await supabase.from("productos").select("*, producto_variantes(*)").order("categoria").order("nombre");
    const conVariantes = (data || []).map((p: any) => ({ ...p, variantes: p.producto_variantes || [] }));
    setProductos(conVariantes);
  }
  async function cargarPedidos() {
    const { data } = await supabase.from("pedidos").select("*").order("creado_en", { ascending: false });
    setPedidos(data || []);
  }
  async function cargarMovimientos() {
    const { data } = await supabase.from("movimientos_stock").select("*").order("creado_en", { ascending: false }).limit(30);
    setMovimientos(data || []);
  }

  const pendientes = pedidos.filter((p) => p.estado === "pendiente").length;

  function irA(v) {
    setVista(v);
    setMenuAbierto(false);
  }

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${TINTA}14` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setMenuAbierto(true)} style={{ background: "transparent", border: "none", padding: 4, display: "flex" }}>
            <Menu size={22} color={TINTA} />
          </button>
          <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: 17, fontWeight: 700, color: TINTA }}>
            neyco <span style={{ color: DORADO }}>admin</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {pendientes > 0 && (
            <span style={{ background: DORADO, color: "#fff", fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: "3px 9px" }}>
              {pendientes} pendiente{pendientes > 1 ? "s" : ""}
            </span>
          )}
          <button onClick={() => supabase.auth.signOut()} style={{ background: "transparent", border: "none", color: TINTA, opacity: 0.6, display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontFamily: "inherit" }}>
            <LogOut size={15} /> Salir
          </button>
        </div>
      </div>

      {menuAbierto && <div onClick={() => setMenuAbierto(false)} style={{ position: "fixed", inset: 0, background: "#00000055", zIndex: 20 }} />}

      <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 220, background: SIDEBAR_BG, transform: menuAbierto ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.25s ease", zIndex: 21, padding: 18, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, color: DORADO_CLARO, fontSize: 16 }}>neyco</div>
          <button onClick={() => setMenuAbierto(false)} style={{ background: "transparent", border: "none", padding: 2 }}>
            <X size={18} color="#fff" />
          </button>
        </div>
        <MenuItem icono={<ClipboardList size={16} />} label="Pedidos" activo={vista === "pedidos"} onClick={() => irA("pedidos")} />
        <MenuItem icono={<Package size={16} />} label="Productos" activo={vista === "productos"} onClick={() => irA("productos")} />
        <MenuItem icono={<Boxes size={16} />} label="Stock (entradas/salidas)" activo={vista === "stock"} onClick={() => irA("stock")} />
        <MenuItem icono={<Bookmark size={16} />} label="Faltantes" activo={vista === "faltantes"} onClick={() => irA("faltantes")} badge={productos.filter((p) => p.necesita_reposicion).length} />
        <MenuItem icono={<LayoutDashboard size={16} />} label="Resumen" activo={vista === "resumen"} onClick={() => irA("resumen")} />
        <MenuItem icono={<Settings size={16} />} label="Configuración" activo={vista === "configuracion"} onClick={() => irA("configuracion")} />
      </div>

      <div style={{ padding: 18 }}>
        {vista === "pedidos" && <ListaPedidos pedidos={pedidos} recargar={cargarPedidos} />}
        {vista === "productos" && <TablaProductos productos={productos} recargar={cargarProductos} />}
        {vista === "faltantes" && <ListaFaltantes productos={productos} recargar={cargarProductos} />}
        {vista === "stock" && (
          <PanelStock productos={productos} movimientos={movimientos} recargarProductos={cargarProductos} recargarMovimientos={cargarMovimientos} />
        )}
        {vista === "resumen" && <Resumen productos={productos} pedidos={pedidos} />}
        {vista === "configuracion" && <PanelConfiguracion />}
      </div>
    </div>
  );
}

function MenuItem({ icono, label, activo, onClick, badge }: { icono: React.ReactNode; label: string; activo: boolean; onClick: () => void; badge?: number }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "none", background: activo ? DORADO_CLARO : "transparent", color: activo ? SIDEBAR_BG : "#EDE7D8", fontSize: 13, fontWeight: 600, fontFamily: "inherit", textAlign: "left", cursor: "pointer" }}>
      {icono} <span style={{ flex: 1 }}>{label}</span>
      {!!badge && (
        <span style={{ background: activo ? SIDEBAR_BG : DORADO_CLARO, color: activo ? DORADO_CLARO : SIDEBAR_BG, fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "1px 7px" }}>
          {badge}
        </span>
      )}
    </button>
  );
}

function StatCard({ label, valor, color }) {
  return (
    <div style={{ background: SUPERFICIE, border: `1px solid ${TINTA}14`, borderRadius: 10, padding: "14px 10px", textAlign: "center" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color }}>{valor}</div>
      <div style={{ fontSize: 10.5, opacity: 0.6, marginTop: 2 }}>{label}</div>
    </div>
  );
}

const VENTAS_ULTIMOS_DIAS = [
  { dia: "Lun", total: 18400 }, { dia: "Mar", total: 24200 }, { dia: "Mié", total: 15800 },
  { dia: "Jue", total: 31200 }, { dia: "Vie", total: 27600 }, { dia: "Sáb", total: 42100 }, { dia: "Dom", total: 19300 },
];

function Resumen({ productos, pedidos }) {
  const pendientes = pedidos.filter((p) => p.estado === "pendiente").length;
  const sinStock = productos.filter((p) => p.stock === 0).length;
  const vendidoReciente = pedidos.reduce((acc, p) => acc + p.total, 0);
  const porEstado = ["pendiente", "confirmado", "entregado"].map((estado) => ({
    estado, cantidad: pedidos.filter((p) => p.estado === estado).length,
  }));
  const coloresEstado = { pendiente: DORADO, confirmado: "#3D7FC4", entregado: VERDE };

  return (
    <div>
      <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: 17, fontWeight: 700, marginBottom: 14 }}>Resumen</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
        <StatCard label="Pedidos pendientes" valor={pendientes} color={pendientes > 0 ? DORADO : VERDE} />
        <StatCard label="Vendido (total cargado)" valor={fmt(vendidoReciente)} color={DORADO} />
        <StatCard label="Sin stock" valor={sinStock} color={sinStock > 0 ? ROJO : VERDE} />
      </div>

      <div style={{ fontSize: 12.5, fontWeight: 700, opacity: 0.6, marginBottom: 8 }}>VENTAS - ÚLTIMOS 7 DÍAS (ejemplo, falta conectar histórico real)</div>
      <div style={{ background: SUPERFICIE, border: `1px solid ${TINTA}14`, borderRadius: 10, padding: "12px 8px 4px", marginBottom: 20, height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={VENTAS_ULTIMOS_DIAS} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={`${TINTA}14`} vertical={false} />
            <XAxis dataKey="dia" tick={{ fontSize: 11, fill: TINTA }} axisLine={{ stroke: `${TINTA}22` }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: TINTA }} axisLine={false} tickLine={false} width={46} />
            <Tooltip formatter={(v) => fmt(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Bar dataKey="total" fill={DORADO} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ fontSize: 12.5, fontWeight: 700, opacity: 0.6, marginBottom: 8 }}>PEDIDOS POR ESTADO (en vivo)</div>
      <div style={{ background: SUPERFICIE, border: `1px solid ${TINTA}14`, borderRadius: 10, padding: 12, display: "flex", alignItems: "center", gap: 10, height: 170 }}>
        <div style={{ width: 130, height: 130, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={porEstado} dataKey="cantidad" nameKey="estado" innerRadius={32} outerRadius={58} paddingAngle={3}>
                {porEstado.map((e) => (<Cell key={e.estado} fill={coloresEstado[e.estado]} />))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {porEstado.map((e) => (
            <div key={e.estado} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <span style={{ width: 9, height: 9, borderRadius: 99, background: coloresEstado[e.estado] }} />
              <span style={{ textTransform: "capitalize", opacity: 0.8 }}>{e.estado}</span>
              <span style={{ fontWeight: 700 }}>({e.cantidad})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TablaProductos({ productos, recargar }: { productos: Producto[]; recargar: () => void }) {
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("Todas");
  const [filtroDelivery, setFiltroDelivery] = useState<"todos" | "ppl" | "solo-takeaway">("todos");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nuevo, setNuevo] = useState({ nombre: "", categoria: "", precio: "" });
  const [guardandoId, setGuardandoId] = useState(null);

  const categorias = ["Todas", ...Array.from(new Set(productos.map((p) => p.categoria)))];
  const filtrados = productos.filter((p) => {
    const matchTexto = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const matchCat = categoria === "Todas" || p.categoria === categoria;
    const matchDelivery =
      filtroDelivery === "todos" ||
      (filtroDelivery === "ppl" && p.disponible_ppl) ||
      (filtroDelivery === "solo-takeaway" && !p.disponible_ppl);
    return matchTexto && matchCat && matchDelivery;
  });

  async function guardarPrecio(p, nuevoPrecio) {
    setGuardandoId(p.id);
    await supabase.from("productos").update({ precio: nuevoPrecio }).eq("id", p.id);
    setGuardandoId(null);
    recargar();
  }

  async function eliminar(id) {
    await supabase.from("productos").delete().eq("id", id);
    recargar();
  }

  async function agregarProducto() {
    if (!nuevo.nombre.trim() || !nuevo.precio) return;
    await supabase.from("productos").insert({
      nombre: nuevo.nombre,
      categoria: nuevo.categoria || "Sin categoría",
      precio: Number(nuevo.precio),
      stock: 0,
    });
    setNuevo({ nombre: "", categoria: "", precio: "" });
    setMostrarForm(false);
    recargar();
  }

  async function toggleFaltante(p) {
    await supabase.from("productos").update({ necesita_reposicion: !p.necesita_reposicion }).eq("id", p.id);
    recargar();
  }

  async function toggleDelivery(p) {
    await supabase.from("productos").update({ disponible_ppl: !p.disponible_ppl }).eq("id", p.id);
    recargar();
  }

  async function guardarPrecioPPL(p, nuevoPrecioPPL) {
    await supabase.from("productos").update({ precio_ppl: nuevoPrecioPPL }).eq("id", p.id);
    recargar();
  }

  return (
    <div>
      <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: 17, fontWeight: 700, marginBottom: 14 }}>Productos</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 160px" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: 11, opacity: 0.5 }} />
          <input placeholder="Buscar producto..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ ...inputStyle, width: "100%", paddingLeft: 30 }} />
        </div>
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={{ ...inputStyle, flex: "1 1 120px" }}>
          {categorias.map((c) => (<option key={c} value={c}>{c}</option>))}
        </select>
        <button onClick={() => setMostrarForm((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 6, background: DORADO, color: "#fff", border: "none", borderRadius: 8, padding: "9px 14px", fontWeight: 700, fontSize: 13, fontFamily: "inherit" }}>
          <Plus size={15} /> Nuevo
        </button>
      </div>

      {mostrarForm && (
        <div style={{ background: SUPERFICIE, border: `1px solid ${TINTA}22`, borderRadius: 10, padding: 12, marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input placeholder="Nombre del producto" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} style={{ ...inputStyle, flex: "2 1 160px" }} />
          <input placeholder="Categoría" value={nuevo.categoria} onChange={(e) => setNuevo({ ...nuevo, categoria: e.target.value })} style={{ ...inputStyle, flex: "1 1 100px" }} />
          <input placeholder="Precio" type="number" value={nuevo.precio} onChange={(e) => setNuevo({ ...nuevo, precio: e.target.value })} style={{ ...inputStyle, flex: "1 1 80px" }} />
          <button onClick={agregarProducto} style={{ background: DORADO, color: "#fff", border: "none", borderRadius: 8, padding: "9px 14px", fontWeight: 700, fontSize: 13, fontFamily: "inherit" }}>Agregar</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {[
          { id: "todos", label: "Todos" },
          { id: "ppl", label: "🚚 En PPL" },
          { id: "solo-takeaway", label: "Solo tienda general" },
        ].map((op) => (
          <button
            key={op.id}
            onClick={() => setFiltroDelivery(op.id as any)}
            style={{
              padding: "5px 10px", borderRadius: 6, border: `1px solid ${TINTA}33`,
              background: filtroDelivery === op.id ? TINTA : "transparent",
              color: filtroDelivery === op.id ? "#fff" : TINTA, fontSize: 11, fontFamily: "inherit",
            }}
          >
            {op.label}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 11.5, opacity: 0.55, marginBottom: 8 }}>{filtrados.length} de {productos.length} productos</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtrados.map((p) => (
          <ProductoFila key={p.id} p={p} onGuardarPrecio={guardarPrecio} onEliminar={eliminar} onToggleFaltante={toggleFaltante} onToggleDelivery={toggleDelivery} onGuardarPrecioPPL={guardarPrecioPPL} guardando={guardandoId === p.id} recargar={recargar} />
        ))}
      </div>
    </div>
  );
}

function ProductoFila({
  p, onGuardarPrecio, onEliminar, onToggleFaltante, onToggleDelivery, onGuardarPrecioPPL, guardando, recargar,
}: {
  p: Producto; onGuardarPrecio: (p: Producto, nuevoPrecio: number) => void; onEliminar: (id: number) => void;
  onToggleFaltante: (p: Producto) => void; onToggleDelivery: (p: Producto) => void; onGuardarPrecioPPL: (p: Producto, nuevoPrecioPPL: number | null) => void; guardando: boolean; recargar: () => void;
}) {
  const [precio, setPrecio] = useState(p.precio);
  const [precioPPL, setPrecioPPL] = useState<number | "">(p.precio_ppl ?? "");
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [mostrarVariantes, setMostrarVariantes] = useState(false);
  const cambiado = precio !== p.precio;
  const cambiadoPPL = precioPPL !== (p.precio_ppl ?? "");
  const fileInputId = `foto-${p.id}`;

  async function subirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendoFoto(true);

    const extension = file.name.split(".").pop();
    const ruta = `producto-${p.id}-${Date.now()}.${extension}`;

    const { error: errorSubida } = await supabase.storage.from("productos-fotos").upload(ruta, file, { upsert: true });
    if (!errorSubida) {
      const { data } = supabase.storage.from("productos-fotos").getPublicUrl(ruta);
      await supabase.from("productos").update({ foto: data.publicUrl }).eq("id", p.id);
      recargar();
    }
    setSubiendoFoto(false);
  }

  return (
    <div style={{ background: SUPERFICIE, border: `1px solid ${TINTA}14`, borderRadius: 10, padding: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <label htmlFor={fileInputId} style={{ position: "relative", cursor: "pointer", flexShrink: 0 }} title="Tocar para cambiar la foto">
          {p.foto ? (
            <img src={p.foto} alt={p.nombre} style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 6, background: "#0000000A" }} />
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: 6, background: "#0000000A", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Upload size={14} color={`${TINTA}77`} />
            </div>
          )}
          {subiendoFoto && (
            <div style={{ position: "absolute", inset: 0, background: "#FFFFFFCC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, borderRadius: 6 }}>...</div>
          )}
          <input id={fileInputId} type="file" accept="image/*" onChange={subirFoto} style={{ display: "none" }} />
        </label>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.nombre}</div>
          <div style={{ fontSize: 11, opacity: 0.55 }}>{p.categoria}</div>
        </div>
        <input type="number" value={precio} onChange={(e) => setPrecio(Number(e.target.value))} style={{ ...inputStyle, width: 78, padding: "6px 8px", fontSize: 12.5 }} />
        <div style={{ fontSize: 11, fontWeight: 700, color: p.stock === 0 ? ROJO : VERDE, width: 56, textAlign: "center" }}>
          {p.stock === 0 ? "Sin stock" : `${p.stock} un.`}
        </div>
        {cambiado && (
          <button onClick={() => onGuardarPrecio(p, precio)} disabled={guardando} style={{ background: DORADO, border: "none", borderRadius: 7, padding: "6px 9px", color: "#fff", fontSize: 11, fontWeight: 700, fontFamily: "inherit" }}>
            {guardando ? "..." : "Guardar"}
          </button>
        )}
        <button onClick={() => setMostrarVariantes((v) => !v)} title="Sabores / variantes" style={{ background: "transparent", border: "none", color: (p.variantes?.length || 0) > 0 ? DORADO : `${TINTA}55`, padding: 6 }}>
          <Layers size={16} />
        </button>
        <button onClick={() => onToggleFaltante(p)} title="Marcar para comprar" style={{ background: "transparent", border: "none", color: p.necesita_reposicion ? DORADO : `${TINTA}55`, padding: 6 }}>
          <Bookmark size={16} fill={p.necesita_reposicion ? DORADO : "none"} />
        </button>
        <button onClick={() => onToggleDelivery(p)} title={p.disponible_ppl ? "Disponible en canal PPL (tocar para sacar)" : "No disponible en canal PPL (tocar para incluir)"} style={{ background: "transparent", border: "none", color: p.disponible_ppl ? "#3D7FC4" : `${TINTA}55`, padding: 6 }}>
          <Truck size={16} />
        </button>
        {p.disponible_ppl && (
          <input
            type="number"
            value={precioPPL}
            onChange={(e) => setPrecioPPL(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder={`$${p.precio}`}
            title="Precio propio para PPL (vacío = usa el precio general)"
            style={{ ...inputStyle, width: 78, padding: "6px 8px", fontSize: 12.5, borderColor: "#3D7FC4" }}
          />
        )}
        {p.disponible_ppl && cambiadoPPL && (
          <button
            onClick={() => onGuardarPrecioPPL(p, precioPPL === "" ? null : precioPPL)}
            style={{ background: "#3D7FC4", border: "none", borderRadius: 7, padding: "6px 9px", color: "#fff", fontSize: 11, fontWeight: 700, fontFamily: "inherit" }}
          >
            Guardar
          </button>
        )}
        <button onClick={() => onEliminar(p.id)} style={{ background: "transparent", border: "none", color: ROJO, padding: 6 }}>
          <Trash2 size={15} />
        </button>
      </div>

      {mostrarVariantes && <GestorVariantes producto={p} recargar={recargar} />}
    </div>
  );
}

function GestorVariantes({ producto, recargar }: { producto: Producto; recargar: () => void }) {
  const [nuevaVariante, setNuevaVariante] = useState({ nombre: "", stock: "", precio: "" });
  const [guardando, setGuardando] = useState(false);

  async function agregar() {
    if (!nuevaVariante.nombre.trim()) return;
    setGuardando(true);
    await supabase.from("producto_variantes").insert({
      producto_id: producto.id,
      nombre: nuevaVariante.nombre,
      stock: Number(nuevaVariante.stock) || 0,
      precio: nuevaVariante.precio ? Number(nuevaVariante.precio) : null,
    });
    setNuevaVariante({ nombre: "", stock: "", precio: "" });
    setGuardando(false);
    recargar();
  }

  async function actualizarStock(varianteId: number, stock: number) {
    await supabase.from("producto_variantes").update({ stock }).eq("id", varianteId);
    recargar();
  }

  async function eliminarVariante(varianteId: number) {
    await supabase.from("producto_variantes").delete().eq("id", varianteId);
    recargar();
  }

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${TINTA}22`, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.55 }}>
        SABORES / VARIANTES {(producto.variantes?.length || 0) === 0 && "— este producto todavía no tiene, se vende como único"}
      </div>

      {(producto.variantes || []).map((v) => (
        <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
          <div style={{ flex: 1 }}>{v.nombre} {v.precio != null && <span style={{ opacity: 0.55 }}>({fmt(v.precio)})</span>}</div>
          <input
            type="number"
            defaultValue={v.stock}
            onBlur={(e) => actualizarStock(v.id, Number(e.target.value))}
            style={{ ...inputStyle, width: 60, padding: "5px 7px", fontSize: 12 }}
          />
          <button onClick={() => eliminarVariante(v.id)} style={{ background: "transparent", border: "none", color: ROJO, padding: 4 }}>
            <Trash2 size={13} />
          </button>
        </div>
      ))}

      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        <input placeholder="Sabor nuevo" value={nuevaVariante.nombre} onChange={(e) => setNuevaVariante({ ...nuevaVariante, nombre: e.target.value })} style={{ ...inputStyle, flex: 2, padding: "6px 8px", fontSize: 12 }} />
        <input placeholder="Stock" type="number" value={nuevaVariante.stock} onChange={(e) => setNuevaVariante({ ...nuevaVariante, stock: e.target.value })} style={{ ...inputStyle, flex: 1, padding: "6px 8px", fontSize: 12 }} />
        <input placeholder="Precio (opc.)" type="number" value={nuevaVariante.precio} onChange={(e) => setNuevaVariante({ ...nuevaVariante, precio: e.target.value })} style={{ ...inputStyle, flex: 1, padding: "6px 8px", fontSize: 12 }} />
        <button onClick={agregar} disabled={guardando} style={{ background: DORADO, color: "#fff", border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 11.5, fontWeight: 700, fontFamily: "inherit" }}>
          + Agregar
        </button>
      </div>
    </div>
  );
}

function ListaFaltantes({ productos, recargar }: { productos: Producto[]; recargar: () => void }) {
  const faltantes = productos.filter((p) => p.necesita_reposicion);
  const porCategoria = faltantes.reduce<Record<string, Producto[]>>((acc, p) => {
    (acc[p.categoria] = acc[p.categoria] || []).push(p);
    return acc;
  }, {});

  async function quitar(p: Producto) {
    await supabase.from("productos").update({ necesita_reposicion: false }).eq("id", p.id);
    recargar();
  }

  return (
    <div>
      <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Faltantes</div>
      <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 16 }}>
        Marcá productos desde "Productos" tocando la banderita. Acá te arman la lista de compra — tocá uno cuando ya lo compraste, para sacarlo.
      </div>

      {faltantes.length === 0 && <div style={{ opacity: 0.55, fontSize: 13 }}>No hay nada marcado como faltante por ahora.</div>}

      {Object.entries(porCategoria).map(([categoria, items]) => (
        <div key={categoria} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, opacity: 0.55, marginBottom: 8, textTransform: "uppercase" }}>{categoria}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {items.map((p) => (
              <div
                key={p.id}
                onClick={() => quitar(p)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: SUPERFICIE, border: `1px solid ${TINTA}14`, borderRadius: 9, cursor: "pointer" }}
              >
                <div style={{ width: 20, height: 20, borderRadius: 5, border: `1.5px solid ${DORADO}`, flexShrink: 0 }} />
                {p.foto && <img src={p.foto} alt={p.nombre} style={{ width: 32, height: 32, objectFit: "contain", borderRadius: 5, flexShrink: 0 }} />}
                <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{p.nombre}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: p.stock === 0 ? ROJO : VERDE }}>{p.stock === 0 ? "Sin stock" : `${p.stock} un.`}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PanelStock({ productos, movimientos, recargarProductos, recargarMovimientos }) {
  const [productoId, setProductoId] = useState(productos[0]?.id || "");
  const [tipo, setTipo] = useState("entrada");
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function registrar() {
    const cant = Number(cantidad);
    if (!productoId || !cant) return;
    const producto = productos.find((p) => p.id === Number(productoId));
    if (!producto) return;

    setGuardando(true);
    const delta = tipo === "entrada" ? cant : -cant;
    const nuevoStock = Math.max(0, producto.stock + delta);

    await supabase.from("productos").update({ stock: nuevoStock }).eq("id", producto.id);
    await supabase.from("movimientos_stock").insert({
      producto_id: producto.id,
      producto_nombre: producto.nombre,
      tipo,
      cantidad: cant,
      motivo: motivo || null,
    });

    setGuardando(false);
    setCantidad("");
    setMotivo("");
    recargarProductos();
    recargarMovimientos();
  }

  return (
    <div>
      <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: 17, fontWeight: 700, marginBottom: 14 }}>Stock — entradas y salidas</div>

      <div style={{ background: SUPERFICIE, border: `1px solid ${TINTA}14`, borderRadius: 10, padding: 14, marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <select value={productoId} onChange={(e) => setProductoId(e.target.value)} style={inputStyle}>
          {productos.map((p) => (<option key={p.id} value={p.id}>{p.nombre} (stock: {p.stock})</option>))}
        </select>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setTipo("entrada")} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: `1.5px solid ${VERDE}`, background: tipo === "entrada" ? VERDE : "transparent", color: tipo === "entrada" ? "#fff" : VERDE, fontWeight: 700, fontSize: 12.5, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <ArrowUpCircle size={15} /> Entrada
          </button>
          <button onClick={() => setTipo("salida")} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: `1.5px solid ${ROJO}`, background: tipo === "salida" ? ROJO : "transparent", color: tipo === "salida" ? "#fff" : ROJO, fontWeight: 700, fontSize: 12.5, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <ArrowDownCircle size={15} /> Salida
          </button>
        </div>

        <input type="number" placeholder="Cantidad" value={cantidad} onChange={(e) => setCantidad(e.target.value)} style={inputStyle} />
        <input placeholder="Motivo (opcional): reposición, rotura, vencimiento..." value={motivo} onChange={(e) => setMotivo(e.target.value)} style={inputStyle} />

        <button onClick={registrar} disabled={guardando} style={{ background: DORADO, color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", fontWeight: 700, fontSize: 13, fontFamily: "inherit" }}>
          {guardando ? "Guardando..." : "Guardar movimiento"}
        </button>
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.6, marginBottom: 8 }}>HISTORIAL</div>
      {movimientos.length === 0 && <div style={{ opacity: 0.55, fontSize: 13 }}>Todavía no hay movimientos registrados.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {movimientos.map((m) => (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${TINTA}0F` }}>
            {m.tipo === "entrada" ? <ArrowUpCircle size={18} color={VERDE} /> : <ArrowDownCircle size={18} color={ROJO} />}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>{m.producto_nombre}</div>
              <div style={{ fontSize: 11, opacity: 0.55 }}>{m.motivo || "sin motivo"} · {new Date(m.creado_en).toLocaleString("es-AR")}</div>
            </div>
            <div style={{ fontWeight: 700, fontSize: 13, color: m.tipo === "entrada" ? VERDE : ROJO }}>
              {m.tipo === "entrada" ? "+" : "-"}{m.cantidad}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ListaPedidos({ pedidos, recargar }: { pedidos: Pedido[]; recargar: () => void }) {
  const [filtro, setFiltro] = useState("todos");
  const [expandido, setExpandido] = useState<number | null>(null);

  const filtrados = filtro === "todos" ? pedidos : pedidos.filter((p) => p.estado === filtro);

  async function cambiarEstado(id: number, estado: string) {
    await supabase.from("pedidos").update({ estado }).eq("id", id);
    recargar();
  }

  return (
    <div>
      <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: 17, fontWeight: 700, marginBottom: 14 }}>Pedidos</div>

      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {["todos", "pendiente", "confirmado", "entregado"].map((f) => (
          <button key={f} onClick={() => setFiltro(f)} style={{ padding: "6px 12px", borderRadius: 7, border: `1px solid ${DORADO}`, background: filtro === f ? DORADO : "transparent", color: filtro === f ? "#fff" : DORADO, fontSize: 11.5, fontWeight: 600, fontFamily: "inherit", textTransform: "capitalize" }}>
            {f}
          </button>
        ))}
      </div>

      {filtrados.length === 0 && <div style={{ opacity: 0.55, fontSize: 13 }}>No hay pedidos en este estado.</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtrados.map((p) => {
          const abierto = expandido === p.id;
          const colorEstado = p.estado === "pendiente" ? DORADO : p.estado === "confirmado" ? "#3D7FC4" : VERDE;
          return (
            <div key={p.id} style={{ background: SUPERFICIE, border: `1px solid ${TINTA}14`, borderRadius: 10, padding: 14 }}>
              <div onClick={() => setExpandido(abierto ? null : p.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                <div>
                  <div style={{ fontWeight: 700, color: DORADO }}>{p.numero_orden}</div>
                  <div style={{ fontSize: 11.5, opacity: 0.6 }}>{p.cliente_nombre} · {new Date(p.creado_en).toLocaleString("es-AR")}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: colorEstado, textTransform: "uppercase" }}>{p.estado}</span>
                  <div style={{ fontWeight: 700 }}>{fmt(p.total)}</div>
                  {abierto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {abierto && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px dashed ${TINTA}22` }}>
                  <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
                    {p.modo_entrega === "envio" ? `Envío a: ${p.direccion}` : "Retira en el local"} · Tel: {p.telefono}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 10 }}>
                    {(p.items || []).map((it, i) => (<div key={i}>- {it.cantidad}x {it.nombre} ({fmt(it.precio * it.cantidad)})</div>))}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {["pendiente", "confirmado", "entregado"].map((estado) => (
                      <button key={estado} onClick={() => cambiarEstado(p.id, estado)} style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${DORADO}`, background: p.estado === estado ? DORADO : "transparent", color: p.estado === estado ? "#fff" : DORADO, fontSize: 11, fontFamily: "inherit" }}>
                        {estado}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PanelConfiguracion() {
  const [config, setConfig] = useState<Configuracion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setCargando(true);
    const { data } = await supabase.from("configuracion").select("*").eq("id", 1).single();
    setConfig(data as Configuracion);
    setCargando(false);
  }

  async function guardar() {
    if (!config) return;
    setGuardando(true);
    await supabase
      .from("configuracion")
      .update({
        usar_precios_diferenciados: config.usar_precios_diferenciados,
        recargo_delivery_porcentaje: config.recargo_delivery_porcentaje,
      })
      .eq("id", 1);
    setGuardando(false);
  }

  if (cargando || !config) return <div style={{ opacity: 0.6, fontSize: 13 }}>Cargando configuración...</div>;

  return (
    <div>
      <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Configuración</div>
      <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 16 }}>
        Precios distintos según si el cliente elige delivery o take away, para cubrir el costo extra del envío.
      </div>

      <div style={{ background: SUPERFICIE, border: `1px solid ${TINTA}14`, borderRadius: 10, padding: 16, display: "flex", flexDirection: "column", gap: 14, maxWidth: 420 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={config.usar_precios_diferenciados}
            onChange={(e) => setConfig({ ...config, usar_precios_diferenciados: e.target.checked })}
          />
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>Usar precios diferentes para delivery</span>
        </label>

        {config.usar_precios_diferenciados && (
          <div>
            <label style={{ fontSize: 11.5, opacity: 0.65, display: "block", marginBottom: 5 }}>
              Recargo de delivery sobre el precio base (%)
            </label>
            <input
              type="number"
              value={config.recargo_delivery_porcentaje}
              onChange={(e) => setConfig({ ...config, recargo_delivery_porcentaje: Number(e.target.value) })}
              style={inputStyle}
            />
            <div style={{ fontSize: 11.5, opacity: 0.55, marginTop: 6 }}>
              Ejemplo: un producto de $1.300 con 15% de recargo se muestra a ${Math.round((1300 * 1.15) / 10) * 10} cuando el cliente elige delivery.
            </div>
          </div>
        )}

        <button
          onClick={guardar}
          disabled={guardando}
          style={{ background: DORADO, color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", fontWeight: 700, fontSize: 13, fontFamily: "inherit" }}
        >
          {guardando ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}
