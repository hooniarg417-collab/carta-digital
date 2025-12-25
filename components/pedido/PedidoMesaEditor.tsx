"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import SectionTitle from "@/components/ui/SectionTitle";

import type {
  Categoria,
  Pedido,
  PedidoItem,
  PedidoItemEstado,
  Plato,
} from "@/lib/firestore";
import {
  crearPedido,
  getPedidoActivoPorMesa,
  getPedidoItemsPorPedido,
  getPlatos,
  getCategorias,
  agregarItemAPedido,
  cambiarEstadoPedidoItem,
  deletePedidoItem,
  updatePedidoItem,
  anularPedidoItem,
  cerrarPedido,
  limpiarLlamoMozo,
  limpiarPidioCuenta,
} from "@/lib/firestore";

type Props = {
  mesaCodigo: string;
  modo: "mozo" | "cocina";
  onBack?: () => void;
};

function moneyARS(n: number) {
  try {
    return n.toLocaleString("es-AR");
  } catch {
    return String(n);
  }
}

function toMillis(v: any): number {
  try {
    if (!v) return 0;
    if (typeof v?.toDate === "function") return v.toDate().getTime();
    if (typeof v?.getTime === "function") return v.getTime();
    if (typeof v === "number") return v;
    const d = new Date(v);
    const t = d.getTime();
    return Number.isFinite(t) ? t : 0;
  } catch {
    return 0;
  }
}

function fmtDT(v: any): string {
  const ms = toMillis(v);
  if (!ms) return "—";
  try {
    return new Date(ms).toLocaleString("es-AR", {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function estadoLabel(e: PedidoItemEstado): string {
  if (e === "pendiente") return "pendiente";
  if (e === "en_preparacion") return "en preparación";
  if (e === "listo") return "listo";
  return "entregado";
}

function badgeClass(estado: PedidoItemEstado): string {
  switch (estado) {
    case "pendiente":
      return "bg-red-500/15 border-red-500/30 text-red-200";
    case "en_preparacion":
      return "bg-amber-500/15 border-amber-500/30 text-amber-200";
    case "listo":
      return "bg-emerald-500/15 border-emerald-500/30 text-emerald-200";
    case "entregado":
      return "bg-white/10 border-white/15 text-white/75";
  }
}

function rowTint(estado: PedidoItemEstado): string {
  switch (estado) {
    case "pendiente":
      return "bg-red-500/5";
    case "en_preparacion":
      return "bg-amber-500/5";
    case "listo":
      return "bg-emerald-500/5";
    case "entregado":
      return "bg-white/0";
  }
}

function parseCantidad(raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.floor(n);
}

function parsePrecio(raw: string): number {
  const v = raw.trim().replace(",", ".");
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/** Extras (3 slots) */
type ExtraSlot = { nombre: string; precio: string };

function extrasTotal(extras: ExtraSlot[]): number {
  return extras.reduce((acc, x) => acc + parsePrecio(x.precio || "0"), 0);
}

function extrasAsText(extras: ExtraSlot[]): string {
  const clean = extras
    .map((x) => ({
      nombre: x.nombre.trim(),
      precio: parsePrecio(x.precio || "0"),
    }))
    .filter((x) => x.nombre && x.precio > 0);

  if (clean.length === 0) return "";
  return clean
    .map((x) => `${x.nombre} (+$${moneyARS(x.precio)})`)
    .join(" · ");
}

function mergeNota(original: string | undefined, extras: ExtraSlot[]): string | undefined {
  const base = (original || "").trim();
  const extraTxt = extrasAsText(extras);
  if (!extraTxt) return base || undefined;

  const extraLine = `Extras: ${extraTxt}`;
  if (!base) return extraLine;

  return `${base} | ${extraLine}`;
}

export default function PedidoMesaEditor({ mesaCodigo, modo, onBack }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [pedidoId, setPedidoId] = useState<string>("");

  const [items, setItems] = useState<PedidoItem[]>([]);
  const [platos, setPlatos] = useState<Plato[]>([]);

  // categorías / secciones (selector)
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaSel, setCategoriaSel] = useState<string>("__ALL__");

  // UI: tabs
  const [tab, setTab] = useState<"menu" | "manual">("menu");
  const [extraTab, setExtraTab] = useState<0 | 1 | 2>(0);
  const [extras, setExtras] = useState<ExtraSlot[]>([
    { nombre: "", precio: "" },
    { nombre: "", precio: "" },
    { nombre: "", precio: "" },
  ]);

  // menu
  const [platoId, setPlatoId] = useState("");
  const [cantidadMenu, setCantidadMenu] = useState("1");
  const [notaMenu, setNotaMenu] = useState("");

  // manual
  const [nombreManual, setNombreManual] = useState("");
  const [precioManual, setPrecioManual] = useState("");
  const [cantidadManual, setCantidadManual] = useState("1");
  const [notaManual, setNotaManual] = useState("");

  // editar item
  const [editId, setEditId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editPrecio, setEditPrecio] = useState("");
  const [editCantidad, setEditCantidad] = useState("1");
  const [editNota, setEditNota] = useState("");

  const cargar = async () => {
    if (!mesaCodigo) return;

    try {
      setError(null);
      setLoading(true);

      const p = await getPedidoActivoPorMesa(mesaCodigo);
      let id = p?.id;

      if (!id) {
        id = await crearPedido({ mesaCodigo });
      }

      setPedidoId(id);

      const pedidoActual = await getPedidoActivoPorMesa(mesaCodigo);
      setPedido(pedidoActual);

      const its = await getPedidoItemsPorPedido(id);
      const itsOrdenados = its
        .slice()
        .sort((a, b) => toMillis(a.creadoEn) - toMillis(b.creadoEn));
      setItems(itsOrdenados);

      const ps = await getPlatos();
      setPlatos(ps.filter((x) => x.activo !== false));

      const cs = await getCategorias();
      const csAct = cs.filter((c) => c.activa !== false);
      setCategorias(csAct);
    } catch (e) {
      console.error(e);
      setError("No se pudo cargar la mesa/pedido.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesaCodigo]);

  const platosFiltrados = useMemo(() => {
    const base = platos.slice().sort((a, b) => {
      if (a.categoriaId === b.categoriaId) return (a.orden ?? 9999) - (b.orden ?? 9999);
      return (a.categoriaId || "").localeCompare(b.categoriaId || "");
    });

    if (categoriaSel === "__ALL__") return base;

    return base.filter((p) => p.categoriaId === categoriaSel);
  }, [platos, categoriaSel]);

  const total = useMemo(() => {
    return items.reduce(
      (acc, it) => acc + (it.precioUnitario || 0) * (it.cantidad || 1),
      0
    );
  }, [items]);

  const itemsActivos = useMemo(() => {
    return items.filter((x) => x.estado !== "entregado");
  }, [items]);

  const resetExtras = () => {
    setExtras([{ nombre: "", precio: "" }, { nombre: "", precio: "" }, { nombre: "", precio: "" }]);
    setExtraTab(0);
  };

  const setExtraField = (idx: number, key: "nombre" | "precio", value: string) => {
    setExtras((prev) => {
      const next = prev.slice();
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  };

  const handleAgregarMenu = async () => {
    setError(null);

    const p = platos.find((x) => x.id === platoId);
    if (!p) {
      setError("Seleccioná un plato.");
      return;
    }

    const cant = parseCantidad(cantidadMenu);
    const extraSum = extrasTotal(extras);
    const precioFinal = (p.precio ?? 0) + extraSum;
    const notaFinal = mergeNota(notaMenu.trim() || undefined, extras);

    try {
      setSaving(true);
      await agregarItemAPedido({
        mesaCodigo,
        mesaNombre: pedido?.mesaNombre || undefined,
        tipo: "menu",
        platoId: p.id,
        nombre: p.nombre,
        nota: notaFinal,
        precioUnitario: precioFinal,
        cantidad: cant,
      });

      setPlatoId("");
      setCantidadMenu("1");
      setNotaMenu("");
      resetExtras();
      await cargar();
    } catch (e) {
      console.error(e);
      setError("No se pudo agregar el ítem.");
    } finally {
      setSaving(false);
    }
  };

  const handleAgregarManual = async () => {
    setError(null);

    const n = nombreManual.trim();
    if (!n) {
      setError("Ingresá un nombre para el ítem manual.");
      return;
    }

    const cant = parseCantidad(cantidadManual);
    const basePrecio = parsePrecio(precioManual);
    const extraSum = extrasTotal(extras);
    const precioFinal = basePrecio + extraSum;
    const notaFinal = mergeNota(notaManual.trim() || undefined, extras);

    try {
      setSaving(true);
      await agregarItemAPedido({
        mesaCodigo,
        mesaNombre: pedido?.mesaNombre || undefined,
        tipo: "manual",
        nombre: n,
        nota: notaFinal,
        precioUnitario: precioFinal,
        cantidad: cant,
      });

      setNombreManual("");
      setPrecioManual("");
      setCantidadManual("1");
      setNotaManual("");
      resetExtras();
      await cargar();
    } catch (e) {
      console.error(e);
      setError("No se pudo agregar el ítem.");
    } finally {
      setSaving(false);
    }
  };

  const handleCambiarEstado = async (itemId: string, nuevo: PedidoItemEstado) => {
    setError(null);
    try {
      setSaving(true);
      await cambiarEstadoPedidoItem(itemId, nuevo);
      await cargar();
    } catch (e) {
      console.error(e);
      setError("No se pudo cambiar el estado.");
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async (itemId: string) => {
    if (!confirm("¿Eliminar este ítem?")) return;
    setError(null);
    try {
      setSaving(true);
      await deletePedidoItem(itemId);
      await cargar();
    } catch (e) {
      console.error(e);
      setError("No se pudo eliminar el ítem.");
    } finally {
      setSaving(false);
    }
  };

  const handleAnularCocina = async (itemId: string) => {
    const motivo = prompt("Motivo (opcional):") ?? "";
    setError(null);
    try {
      setSaving(true);
      await anularPedidoItem(itemId, motivo);
      await cargar();
    } catch (e) {
      console.error(e);
      setError("No se pudo anular el ítem.");
    } finally {
      setSaving(false);
    }
  };

  const handleCerrarMesa = async () => {
    if (!pedidoId) return;
    if (!confirm("¿Cerrar la mesa? Se calcula total y queda como cerrada.")) return;

    setError(null);
    try {
      setSaving(true);
      await cerrarPedido(pedidoId);
      onBack?.();
    } catch (e) {
      console.error(e);
      setError("No se pudo cerrar la mesa.");
    } finally {
      setSaving(false);
    }
  };

  const handleLimpiarAvisos = async () => {
    if (!pedidoId) return;
    setError(null);

    try {
      setSaving(true);
      await Promise.all([limpiarLlamoMozo(pedidoId), limpiarPidioCuenta(pedidoId)]);
      await cargar();
    } catch (e) {
      console.error(e);
      setError("No se pudieron limpiar los avisos.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (it: PedidoItem) => {
    setEditId(it.id);
    setEditNombre(it.nombre || "");
    setEditPrecio(String(it.precioUnitario ?? 0));
    setEditCantidad(String(it.cantidad ?? 1));
    setEditNota(it.nota || "");
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditNombre("");
    setEditPrecio("");
    setEditCantidad("1");
    setEditNota("");
  };

  const saveEdit = async (it: PedidoItem) => {
    if (!editId) return;

    const cant = parseCantidad(editCantidad);
    const nota = editNota.trim() || undefined;

    const payload: any = { cantidad: cant, nota };

    if (it.tipo === "manual") {
      const n = editNombre.trim();
      if (!n) {
        setError("El nombre no puede quedar vacío.");
        return;
      }
      payload.nombre = n;
      payload.precioUnitario = parsePrecio(editPrecio);
    }

    setError(null);
    try {
      setSaving(true);
      await updatePedidoItem(editId, payload);
      cancelEdit();
      await cargar();
    } catch (e) {
      console.error(e);
      setError("No se pudo editar el ítem.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full px-3 sm:px-5 py-6 space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.7rem] tracking-[0.35em] uppercase text-[var(--color-text-muted)]">
            {modo === "cocina" ? "Cocina / Barra" : "Mozo"}
          </p>

          <h1 className="text-2xl sm:text-3xl font-playfair font-semibold text-[var(--color-gold)] truncate">
            Mesa {mesaCodigo || "—"}
          </h1>

          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
            Pedido activo · Apertura:{" "}
            <span className="text-white/70">{fmtDT(pedido?.creadoEn)}</span>
          </p>
        </div>

        <div className="flex gap-2 flex-wrap justify-end">
          {onBack && (
            <Button variant="secondary" onClick={onBack}>
              Volver
            </Button>
          )}
          <Button variant="secondary" onClick={cargar} disabled={loading || saving}>
            Actualizar
          </Button>
        </div>
      </header>

      {error && (
        <div className="glass-panel rounded-2xl p-3 text-xs text-red-400 border border-red-500/40">
          {error}
        </div>
      )}

      {/* RESUMEN */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <SectionTitle>Resumen</SectionTitle>
            <div className="text-xs text-[var(--color-text-muted)]">
              Ítems activos:{" "}
              <span className="text-[var(--color-gold-light)] font-semibold">
                {itemsActivos.length}
              </span>{" "}
              · Total (estimado):{" "}
              <span className="text-[var(--color-gold-light)] font-semibold">
                ${moneyARS(total)}
              </span>
            </div>

            {(pedido?.llamoMozo || pedido?.pidioCuenta) && (
              <div className="flex flex-wrap gap-2 mt-2">
                {pedido?.llamoMozo && (
                  <span className="text-[0.7rem] px-2 py-1 rounded-full border border-amber-400/35 bg-amber-500/15 text-amber-200">
                    Llamó mozo
                  </span>
                )}
                {pedido?.pidioCuenta && (
                  <span className="text-[0.7rem] px-2 py-1 rounded-full border border-emerald-400/35 bg-emerald-500/15 text-emerald-200">
                    Pidió cuenta
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2 flex-wrap justify-end">
            {modo === "cocina" && (
              <>
                <Button
                  variant="secondary"
                  onClick={handleLimpiarAvisos}
                  disabled={saving || !pedidoId}
                >
                  Apagar avisos
                </Button>
                <Button
                  className="bg-[var(--color-gold)] text-black"
                  onClick={handleCerrarMesa}
                  disabled={saving || !pedidoId}
                >
                  Cerrar mesa
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* FORM AGREGAR ITEM */}
      <Card>
        <SectionTitle>Agregar ítem</SectionTitle>

        {/* Tabs principales */}
        <div className="flex gap-2 mt-2 flex-wrap">
          <button
            onClick={() => setTab("menu")}
            className={`px-3 py-2 rounded-full text-xs border transition-all ${
              tab === "menu"
                ? "bg-[var(--color-gold)] text-black border-[var(--color-gold)]"
                : "bg-transparent text-white/75 border-white/10 hover:border-white/20"
            }`}
          >
            Desde carta
          </button>
          <button
            onClick={() => setTab("manual")}
            className={`px-3 py-2 rounded-full text-xs border transition-all ${
              tab === "manual"
                ? "bg-[var(--color-gold)] text-black border-[var(--color-gold)]"
                : "bg-transparent text-white/75 border-white/10 hover:border-white/20"
            }`}
          >
            Manual
          </button>
        </div>

        {/* Selector de sección (solo en menú) */}
        {tab === "menu" && (
          <div className="mt-4">
            <label className="text-xs text-[var(--color-text-muted)]">Sección</label>
            <select
              value={categoriaSel}
              onChange={(e) => setCategoriaSel(e.target.value)}
              className="w-full p-3 rounded-lg bg-[rgba(255,255,255,0.05)]
              border border-[rgba(200,169,126,0.35)]
              text-[var(--color-text-light)]"
            >
              <option value="__ALL__">Todas las secciones</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>

            <p className="text-[0.65rem] text-[var(--color-text-muted)] mt-1">
              Tip: “Todas” te muestra toda la carta. Si elegís una sección, el combo de platos se filtra.
            </p>
          </div>
        )}

        {/* ✅ FORM MENU / MANUAL (sube arriba de extras) */}
        {tab === "menu" ? (
          <div className="mt-5 space-y-3">
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">Plato</label>
              <select
                value={platoId}
                onChange={(e) => setPlatoId(e.target.value)}
                className="w-full p-3 rounded-lg bg-[rgba(255,255,255,0.05)]
                border border-[rgba(200,169,126,0.35)]
                text-[var(--color-text-light)]"
              >
                <option value="">Seleccionar…</option>
                {platosFiltrados.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} — ${moneyARS(p.precio ?? 0)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-[var(--color-text-muted)]">
                  Cantidad
                </label>
                <Input
                  value={cantidadMenu}
                  onChange={(e: any) => setCantidadMenu(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-[var(--color-text-muted)]">
                  Nota (opcional)
                </label>
                <Input
                  value={notaMenu}
                  onChange={(e: any) => setNotaMenu(e.target.value)}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs text-[var(--color-text-muted)]">
                  Nombre
                </label>
                <Input
                  value={nombreManual}
                  onChange={(e: any) => setNombreManual(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-[var(--color-text-muted)]">
                  Precio
                </label>
                <Input
                  value={precioManual}
                  onChange={(e: any) => setPrecioManual(e.target.value)}
                  placeholder="Ej: 12500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-[var(--color-text-muted)]">
                  Cantidad
                </label>
                <Input
                  value={cantidadManual}
                  onChange={(e: any) => setCantidadManual(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-[var(--color-text-muted)]">
                  Nota (opcional)
                </label>
                <Input
                  value={notaManual}
                  onChange={(e: any) => setNotaManual(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* ✅ Extras (ahora ABAJO) */}
        <div className="mt-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-[var(--color-text-muted)]">
              Extras (se suman al ítem)
            </p>
            <button
              type="button"
              className="text-[0.7rem] text-[var(--color-gold-light)] hover:underline"
              onClick={resetExtras}
            >
              Limpiar extras
            </button>
          </div>

          <div className="flex gap-2 mt-2 flex-wrap">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                onClick={() => setExtraTab(i as 0 | 1 | 2)}
                className={`px-3 py-2 rounded-full text-xs border transition-all ${
                  extraTab === i
                    ? "bg-[rgba(200,169,126,0.85)] text-black border-[rgba(200,169,126,0.9)]"
                    : "bg-transparent text-white/75 border-white/10 hover:border-white/20"
                }`}
              >
                Extra {i + 1}
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-[var(--color-text-muted)]">
                Nombre extra
              </label>
              <Input
                value={extras[extraTab].nombre}
                onChange={(e: any) => setExtraField(extraTab, "nombre", e.target.value)}
                placeholder="Ej: Papas / Salsa / Extra queso"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">
                Precio extra
              </label>
              <Input
                value={extras[extraTab].precio}
                onChange={(e: any) => setExtraField(extraTab, "precio", e.target.value)}
                placeholder="Ej: 1500"
              />
            </div>
          </div>

          <div className="mt-2 text-[0.7rem] text-white/60">
            Extras cargados:{" "}
            <span className="text-white/80">
              {extrasAsText(extras) || "—"}
            </span>
            {extrasTotal(extras) > 0 && (
              <>
                {" "}
                · Suma:{" "}
                <span className="text-[var(--color-gold-light)] font-semibold">
                  +${moneyARS(extrasTotal(extras))}
                </span>
              </>
            )}
          </div>
        </div>

        {/* ✅ Botón Agregar al final */}
        <div className="flex justify-end mt-4">
          {tab === "menu" ? (
            <Button onClick={handleAgregarMenu} disabled={saving || loading}>
              {saving ? "Agregando..." : "Agregar"}
            </Button>
          ) : (
            <Button onClick={handleAgregarManual} disabled={saving || loading}>
              {saving ? "Agregando..." : "Agregar"}
            </Button>
          )}
        </div>
      </Card>

      {/* LISTA ITEMS */}
      <Card>
        <SectionTitle>Ítems</SectionTitle>

        {loading ? (
          <p className="text-xs text-[var(--color-text-muted)] mt-2">Cargando ítems…</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)] mt-2">Todavía no hay ítems.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {items.map((it) => {
              const sub = (it.precioUnitario || 0) * (it.cantidad || 1);
              const editingThis = editId === it.id;

              return (
                <div
                  key={it.id}
                  className={`
                    ${rowTint(it.estado)}
                    rounded-2xl px-3 py-3
                    border border-white/10
                    flex items-start justify-between gap-3
                  `}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-white font-semibold truncate">
                        {it.cantidad}x {it.nombre}
                      </p>
                      <span
                        className={`text-[0.7rem] px-2 py-0.5 rounded-full border ${badgeClass(
                          it.estado
                        )}`}
                      >
                        {estadoLabel(it.estado)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 mt-1">
                      {it.nota ? (
                        <p className="text-xs text-white/65 truncate">Nota: {it.nota}</p>
                      ) : (
                        <span />
                      )}

                      <p className="text-xs text-[var(--color-gold-light)] tabular-nums whitespace-nowrap">
                        ${moneyARS(it.precioUnitario || 0)} · Sub: ${moneyARS(sub)}
                      </p>
                    </div>

                    <p className="text-[0.65rem] text-white/45 mt-1">
                      {fmtDT(it.creadoEn)}
                    </p>

                    {/* Editor inline (solo mozo) */}
                    {modo === "mozo" && editingThis && (
                      <div className="mt-3 rounded-xl border border-white/10 bg-[rgba(10,9,8,0.55)] p-3 space-y-3">
                        <p className="text-xs text-white/70">Editando ítem</p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {it.tipo === "manual" ? (
                            <>
                              <div className="sm:col-span-2">
                                <label className="text-xs text-[var(--color-text-muted)]">
                                  Nombre
                                </label>
                                <Input
                                  value={editNombre}
                                  onChange={(e: any) => setEditNombre(e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="text-xs text-[var(--color-text-muted)]">
                                  Precio unitario
                                </label>
                                <Input
                                  value={editPrecio}
                                  onChange={(e: any) => setEditPrecio(e.target.value)}
                                />
                              </div>
                            </>
                          ) : (
                            <div className="sm:col-span-3 text-[0.75rem] text-white/55">
                              Ítem de carta: por seguridad solo se edita cantidad y nota.
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs text-[var(--color-text-muted)]">
                              Cantidad
                            </label>
                            <Input
                              value={editCantidad}
                              onChange={(e: any) => setEditCantidad(e.target.value)}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-xs text-[var(--color-text-muted)]">
                              Nota
                            </label>
                            <Input
                              value={editNota}
                              onChange={(e: any) => setEditNota(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end flex-wrap">
                          <Button variant="secondary" onClick={cancelEdit} disabled={saving}>
                            Cancelar
                          </Button>
                          <Button onClick={() => saveEdit(it)} disabled={saving}>
                            Guardar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 items-end">
                    {modo === "cocina" ? (
                      <>
                        <label className="text-[0.65rem] text-white/55">Estado</label>
                        <select
                          value={it.estado}
                          disabled={saving}
                          onChange={(e) =>
                            handleCambiarEstado(it.id, e.target.value as PedidoItemEstado)
                          }
                          className="
                            text-xs
                            rounded-xl px-2 py-2
                            bg-[rgba(10,9,8,0.85)]
                            border border-white/15
                            text-white
                            focus:outline-none focus:border-[rgba(200,169,126,0.55)]
                            disabled:opacity-60
                          "
                        >
                          <option value="pendiente">pendiente</option>
                          <option value="en_preparacion">en preparación</option>
                          <option value="listo">listo</option>
                          <option value="entregado">entregado</option>
                        </select>
                      </>
                    ) : (
                      <div className="text-[0.65rem] text-white/55">
                        Estado: <b className="text-white/75">{estadoLabel(it.estado)}</b>
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap justify-end">
                      {modo === "mozo" ? (
                        <>
                          <Button
                            variant="secondary"
                            className="text-xs px-3 py-2"
                            onClick={() => (editId === it.id ? cancelEdit() : startEdit(it))}
                            disabled={saving}
                          >
                            {editId === it.id ? "Cancelar" : "Editar"}
                          </Button>

                          <Button
                            className="bg-red-700 hover:bg-red-800 text-xs px-3 py-2"
                            onClick={() => handleEliminar(it.id)}
                            disabled={saving}
                          >
                            Eliminar
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="secondary"
                            className="text-xs px-3 py-2"
                            onClick={() => handleAnularCocina(it.id)}
                            disabled={saving}
                          >
                            Anular
                          </Button>

                          <Button
                            className="bg-red-700 hover:bg-red-800 text-xs px-3 py-2"
                            onClick={() => handleEliminar(it.id)}
                            disabled={saving}
                          >
                            Eliminar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="flex justify-end pt-2">
              <div className="text-sm text-white/75">
                Total:{" "}
                <span className="text-[var(--color-gold)] font-semibold tabular-nums">
                  ${moneyARS(total)}
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
