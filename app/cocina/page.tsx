"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type { Pedido, PedidoItem, PedidoItemEstado } from "@/lib/firestore";
import {
  getPedidosAbiertos,
  getPedidoItemsPorPedidos,
  cambiarEstadoPedidoItem,
  limpiarLlamoMozo,
  limpiarPidioCuenta,
  cerrarPedido,
} from "@/lib/firestore";

/** ✅ Refresco: 40 segundos */
const REFRESH_MS = 40_000;

/** ✅ Datos del local para ticket */
const TICKET_BIZ_NAME = "Maitreya";
const TICKET_BIZ_SUB = "by Patagonia Gourmet";

type MesaGroup = {
  pedido: Pedido;
  items: PedidoItem[];
  severity: number; // 0..3 (0 = más urgente)
};

function estadoRank(e: PedidoItemEstado): number {
  if (e === "pendiente") return 0;
  if (e === "en_preparacion") return 1;
  if (e === "listo") return 2;
  return 3; // entregado
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

function columnShell(estado: PedidoItemEstado): string {
  switch (estado) {
    case "pendiente":
      return "border-red-500/20 bg-red-500/5";
    case "en_preparacion":
      return "border-amber-500/20 bg-amber-500/5";
    case "listo":
      return "border-emerald-500/20 bg-emerald-500/5";
    case "entregado":
      return "border-white/10 bg-white/[0.02]";
  }
}

function mesaFrameClass(severity: number): string {
  if (severity === 0)
    return "border-red-500/35 shadow-[0_10px_28px_rgba(255,0,0,0.10)]";
  if (severity === 1)
    return "border-amber-500/35 shadow-[0_10px_28px_rgba(255,170,0,0.10)]";
  if (severity === 2)
    return "border-emerald-500/30 shadow-[0_10px_28px_rgba(0,255,140,0.08)]";
  return "border-white/10 opacity-[0.92]";
}

function moneyARS(n: number) {
  try {
    return n.toLocaleString("es-AR");
  } catch {
    return String(n);
  }
}

function escapeHtml(str: string) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * ✅ Ticket “pro” (cliente/cuenta)
 * - NO muestra estados
 * - NO incluye ítems "pendiente"
 */
function buildTicketHtml(pedido: Pedido, items: PedidoItem[]) {
  const itemsFiltrados = items.filter((it) => it.estado !== "pendiente");

  const itemsOrdenados = itemsFiltrados
    .slice()
    .sort((a, b) => {
      const am = a.creadoEn ? a.creadoEn.getTime?.() ?? 0 : 0;
      const bm = b.creadoEn ? b.creadoEn.getTime?.() ?? 0 : 0;
      return am - bm;
    });

  const total = itemsOrdenados.reduce(
    (acc, it) => acc + (it.precioUnitario || 0) * (it.cantidad || 1),
    0
  );

  const rows = itemsOrdenados
    .map((it) => {
      const sub = (it.precioUnitario || 0) * (it.cantidad || 1);
      return `
        <tr>
          <td style="padding:9px 0; width:56px; vertical-align:top;"><b>${it.cantidad}x</b></td>
          <td style="padding:9px 0; vertical-align:top;">
            <div style="font-weight:800; font-size:13px;">${escapeHtml(it.nombre)}</div>
            ${
              it.nota
                ? `<div style="font-size:12px; opacity:.80; margin-top:3px;">Nota: ${escapeHtml(
                    it.nota
                  )}</div>`
                : ""
            }
          </td>
          <td style="padding:9px 0; text-align:right; white-space:nowrap; vertical-align:top;">
            $${moneyARS(it.precioUnitario || 0)}
          </td>
          <td style="padding:9px 0; text-align:right; white-space:nowrap; font-weight:800; vertical-align:top;">
            $${moneyARS(sub)}
          </td>
        </tr>
      `;
    })
    .join("");

  const now = new Date();
  const mesa = pedido.mesaCodigo || "—";

  return `
    <html>
      <head>
        <title>Cuenta Mesa ${escapeHtml(mesa)}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          @page { margin: 10mm; }
          body { font-family: Arial, sans-serif; padding: 0; color: #111; }
          .muted { opacity: .72; }
          .hr { border: none; border-top: 1px solid #ddd; margin: 12px 0; }
          table { width:100%; border-collapse: collapse; border-top:1px solid #e5e5e5; border-bottom:1px solid #e5e5e5; }
          th { text-align:left; padding: 8px 0; font-size: 12px; opacity: .75; }
          .right { text-align:right; }
          .brand { font-size:22px; font-weight:900; margin:0; letter-spacing:.2px; }
          .sub { font-size:12px; }
          .totalBox { margin-top:10px; display:flex; justify-content:flex-end; }
          .totalLine { min-width:260px; display:flex; justify-content:space-between; font-size:15px; }
          .totalLine b { font-size:16px; }
        </style>
      </head>
      <body>
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px;">
          <div>
            <div class="brand">${escapeHtml(TICKET_BIZ_NAME)}</div>
            <div class="sub muted">${escapeHtml(TICKET_BIZ_SUB)}</div>
            <div style="font-size:12px; margin-top:6px;">
              <b>Mesa:</b> ${escapeHtml(mesa)}
            </div>
          </div>
          <div class="muted" style="text-align:right; font-size:12px;">
            ${escapeHtml(now.toLocaleString("es-AR"))}
          </div>
        </div>

        <hr class="hr" />

        ${
          itemsOrdenados.length === 0
            ? `<div class="muted" style="font-size:13px;">No hay ítems para imprimir (los pendientes no se incluyen).</div>`
            : `
              <table>
                <thead>
                  <tr>
                    <th style="width:56px;">Cant</th>
                    <th>Detalle</th>
                    <th class="right">Unit</th>
                    <th class="right">Sub</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows}
                </tbody>
              </table>

              <div class="totalBox">
                <div class="totalLine">
                  <span><b>Total</b></span>
                  <span><b>$${moneyARS(total)}</b></span>
                </div>
              </div>
            `
        }
      </body>
    </html>
  `;
}

function printTicket(pedido: Pedido, items: PedidoItem[]) {
  const w = window.open("", "_blank", "width=520,height=760");
  if (!w) return;
  const html = buildTicketHtml(pedido, items);
  w.document.write(html);
  w.document.close();
  w.onload = () => w.print();
}

function downloadTicketHtml(pedido: Pedido, items: PedidoItem[]) {
  const html = buildTicketHtml(pedido, items);
  const mesa = (pedido.mesaCodigo || "mesa").replaceAll("/", "-");
  const name = `ticket-${mesa}-${new Date()
    .toISOString()
    .slice(0, 19)
    .replaceAll(":", "-")}.html`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export default function CocinaPage() {
  const router = useRouter();

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [items, setItems] = useState<PedidoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [toast, setToast] = useState<string | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [busyPedidoId, setBusyPedidoId] = useState<string | null>(null);

  /** ✅ Popup rojo (alerta mozo/cuenta) */
  const [alerta, setAlerta] = useState<null | {
    pedidoId: string;
    mesaCodigo: string;
    tipo: "mozo" | "cuenta";
  }>(null);

  /** ✅ Modal cierre mesa */
  const [closeModal, setCloseModal] = useState<null | {
    pedido: Pedido;
    items: PedidoItem[];
  }>(null);

  const alertaLockRef = useRef(false);

  // ✅ FIX: evitar “closure vieja” de alerta en setInterval
  const alertaRef = useRef<typeof alerta>(null);
  useEffect(() => {
    alertaRef.current = alerta;
  }, [alerta]);

  const cargar = async () => {
    try {
      // ✅ 1) Pedidos abiertos
      const p = await getPedidosAbiertos();
      setPedidos(p);

      // ✅ 2) Ítems SOLO de esos pedidos (sin leer toda la colección)
      const ids = p.map((x) => x.id).filter(Boolean);
      const it = await getPedidoItemsPorPedidos(ids);
      setItems(it);

      // ✅ dispara alerta (una a la vez)
      if (!alertaRef.current && !alertaLockRef.current) {
        const pedidoConAlerta = p.find((x) => x.llamoMozo) || p.find((x) => x.pidioCuenta);
        if (pedidoConAlerta) {
          alertaLockRef.current = true;
          setAlerta({
            pedidoId: pedidoConAlerta.id,
            mesaCodigo: pedidoConAlerta.mesaCodigo,
            tipo: pedidoConAlerta.llamoMozo ? "mozo" : "cuenta",
          });
          setTimeout(() => (alertaLockRef.current = false), 800);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, REFRESH_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const groups: MesaGroup[] = useMemo(() => {
    const byPedido: Record<string, PedidoItem[]> = {};
    for (const it of items) {
      if (!byPedido[it.pedidoId]) byPedido[it.pedidoId] = [];
      byPedido[it.pedidoId].push(it);
    }

    return pedidos
      .slice()
      .map((p) => {
        const arr = (byPedido[p.id] ?? []).slice().sort((a, b) => {
          const ar = estadoRank(a.estado) - estadoRank(b.estado);
          if (ar !== 0) return ar;
          const am = a.creadoEn ? a.creadoEn.getTime?.() ?? 0 : 0;
          const bm = b.creadoEn ? b.creadoEn.getTime?.() ?? 0 : 0;
          return am - bm;
        });

        const activos = arr.filter((x) => x.estado !== "entregado");
        const severity =
          activos.length === 0 ? 3 : Math.min(...activos.map((x) => estadoRank(x.estado)));

        return { pedido: p, items: arr, severity };
      })
      .sort((a, b) => {
        if (a.severity !== b.severity) return a.severity - b.severity;
        const am = a.pedido.creadoEn ? a.pedido.creadoEn.getTime?.() ?? 0 : 0;
        const bm = b.pedido.creadoEn ? b.pedido.creadoEn.getTime?.() ?? 0 : 0;
        return am - bm;
      });
  }, [pedidos, items]);

  const cambiarEstadoDirecto = async (it: PedidoItem, nuevo: PedidoItemEstado) => {
    try {
      setBusyItemId(it.id);
      await cambiarEstadoPedidoItem(it.id, nuevo);
      setToast(`✅ ${it.nombre}: ${estadoLabel(it.estado)} → ${estadoLabel(nuevo)}`);
      await cargar();
    } catch (e) {
      console.error(e);
      setToast("Error cambiando estado.");
    } finally {
      setBusyItemId(null);
    }
  };

  const aceptarAlerta = async () => {
    if (!alerta) return;

    try {
      setBusyPedidoId(alerta.pedidoId);

      if (alerta.tipo === "mozo") {
        await limpiarLlamoMozo(alerta.pedidoId);
        setToast(`✅ Mesa ${alerta.mesaCodigo}: mozo atendido`);
      } else {
        await limpiarPidioCuenta(alerta.pedidoId);
        setToast(`✅ Mesa ${alerta.mesaCodigo}: cuenta gestionada`);
      }

      setAlerta(null);
      await cargar();
    } catch (e) {
      console.error(e);
      setToast("Error actualizando aviso.");
    } finally {
      setBusyPedidoId(null);
    }
  };

  const abrirMesa = () => {
    const raw = window.prompt("Código de mesa (ej: 3 / Mesa 3 / A1):", "");
    const mesa = (raw || "").trim();
    if (!mesa) return;
    router.push(`/cocina/mesa/${encodeURIComponent(mesa)}`);
  };

  const estados: PedidoItemEstado[] = ["pendiente", "en_preparacion", "listo", "entregado"];

  const itemsByPedido = useMemo(() => {
    const m: Record<string, PedidoItem[]> = {};
    for (const g of groups) m[g.pedido.id] = g.items;
    return m;
  }, [groups]);

  const MesaMiniCard = ({
    group,
    estado,
  }: {
    group: MesaGroup;
    estado: PedidoItemEstado;
  }) => {
    const { pedido, items, severity } = group;
    const mesa = pedido.mesaCodigo || "—";
    const list = items.filter((x) => x.estado === estado);

    // no mostrar tarjeta si no tiene items en esta columna
    if (list.length === 0) return null;

    const todoEntregado = severity === 3;

    return (
      <div
        className={`
          rounded-3xl p-3
          bg-[rgba(20,18,15,0.55)]
          border ${mesaFrameClass(severity)}
          backdrop-blur-lg
        `}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-playfair text-[var(--color-gold)]">
                Mesa {mesa}
              </h3>

              <span className="text-[0.7rem] px-2 py-1 rounded-full border border-white/10 bg-white/5 text-white/85">
                {list.length}
              </span>
            </div>

            {(pedido.llamoMozo || pedido.pidioCuenta) && (
              <div className="flex flex-wrap gap-2 mt-2">
                {pedido.llamoMozo && (
                  <span className="text-[0.7rem] px-2 py-1 rounded-full border border-red-500/30 bg-red-500/15 text-red-200">
                    ⚠ Llamó mozo
                  </span>
                )}
                {pedido.pidioCuenta && (
                  <span className="text-[0.7rem] px-2 py-1 rounded-full border border-red-500/30 bg-red-500/15 text-red-200">
                    💳 Pidió cuenta
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2 flex-wrap justify-end">
            <Button
              variant="secondary"
              className="text-xs px-3 py-2"
              onClick={() => router.push(`/cocina/mesa/${encodeURIComponent(mesa)}`)}
            >
              Editar / Agregar
            </Button>

            <Button
              variant="secondary"
              className="text-xs px-3 py-2"
              onClick={() => printTicket(pedido, items)}
            >
              Ticket
            </Button>

            {todoEntregado && (
              <Button
                className="text-xs px-3 py-2 bg-[var(--color-gold)] text-black hover:opacity-95"
                onClick={() => setCloseModal({ pedido, items })}
              >
                Cerrar mesa
              </Button>
            )}
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {list.map((it) => (
            <div
              key={it.id}
              className="rounded-2xl border border-white/10 bg-[rgba(10,9,8,0.55)] px-2 py-2"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-white font-semibold leading-snug">
                  {it.cantidad}x {it.nombre}
                </p>
                <p className="text-[0.7rem] text-[var(--color-gold-light)] tabular-nums whitespace-nowrap">
                  ${moneyARS(it.precioUnitario || 0)}
                </p>
              </div>

              {it.nota ? (
                <p className="text-[0.72rem] text-white/60 mt-1 truncate">Nota: {it.nota}</p>
              ) : null}

              <div className="mt-2 flex items-end justify-between gap-2">
                <div className="flex flex-col items-start">
                  <label className="text-[0.62rem] text-white/45">Estado</label>
                  <select
                    value={it.estado}
                    disabled={busyItemId === it.id}
                    onChange={(e) => cambiarEstadoDirecto(it, e.target.value as PedidoItemEstado)}
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
                </div>

                <span
                  className={`text-[0.7rem] px-2 py-1 rounded-full border ${badgeClass(it.estado)}`}
                >
                  {estadoLabel(it.estado)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const Column = ({ estado }: { estado: PedidoItemEstado }) => {
    const countItems = groups.reduce(
      (acc, g) => acc + g.items.filter((x) => x.estado === estado).length,
      0
    );

    return (
      <div className={`rounded-3xl border ${columnShell(estado)} p-3`}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className={`text-[0.75rem] px-2 py-1 rounded-full border ${badgeClass(estado)}`}>
            {estadoLabel(estado)}
          </span>
          <span className="text-[0.75rem] text-white/70 tabular-nums">{countItems}</span>
        </div>

        <div className="space-y-3">
          {groups.map((g) => (
            <MesaMiniCard key={`${g.pedido.id}-${estado}`} group={g} estado={estado} />
          ))}
        </div>
      </div>
    );
  };

  const handleCloseMesa = async (mode: "print" | "export" | "no") => {
    if (!closeModal) return;

    const { pedido, items } = closeModal;

    try {
      setBusyPedidoId(pedido.id);

      if (mode === "print") {
        printTicket(pedido, items);
      } else if (mode === "export") {
        downloadTicketHtml(pedido, items);
      }

      await cerrarPedido(pedido.id);
      setToast(`✅ Mesa ${pedido.mesaCodigo}: cerrada`);
      setCloseModal(null);
      await cargar();
    } catch (e) {
      console.error(e);
      setToast("Error cerrando la mesa.");
    } finally {
      setBusyPedidoId(null);
    }
  };

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-playfair text-[var(--color-gold)]">
              Cocina / Barra
            </h1>
            <p className="text-xs text-[var(--color-text-muted)]">
              Refresco automático cada {Math.round(REFRESH_MS / 1000)}s · Kanban global por estado ·
              Ticket sin pendientes
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={abrirMesa}>
              Abrir mesa
            </Button>
            <Button variant="secondary" onClick={cargar}>
              Refrescar
            </Button>
          </div>
        </div>

        {loading ? (
          <Card>
            <p className="text-[var(--color-text-muted)]">Cargando pedidos…</p>
          </Card>
        ) : groups.length === 0 ? (
          <Card>
            <p className="text-[var(--color-text-muted)]">No hay pedidos abiertos.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <Column estado="pendiente" />
            <Column estado="en_preparacion" />
            <Column estado="listo" />
            <Column estado="entregado" />
          </div>
        )}
      </div>

      {/* ✅ Popup rojo fuerte para mozo/cuenta */}
      {alerta && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[min(560px,92vw)]">
          <div className="rounded-3xl bg-red-950/85 border border-red-500/35 shadow-2xl backdrop-blur-xl px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.25em] text-red-200/80">Alerta</p>
                <p className="text-base sm:text-lg font-semibold text-white mt-1">
                  Mesa{" "}
                  <span className="text-[var(--color-gold)] font-bold">{alerta.mesaCodigo}</span>{" "}
                  {alerta.tipo === "mozo" ? "solicita mozo" : "solicita la cuenta"}
                </p>
                <p className="text-xs text-white/70 mt-1">
                  Tocá “Aceptar” cuando lo atiendan para apagar el aviso.
                </p>
              </div>

              <Button
                className="bg-[var(--color-gold)] text-black hover:opacity-95 disabled:opacity-50"
                onClick={aceptarAlerta}
                disabled={busyPedidoId === alerta.pedidoId}
              >
                Aceptar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Modal cierre mesa */}
      {closeModal && (
        <div className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm flex items-center justify-center px-3">
          <div className="w-[min(520px,92vw)] rounded-3xl glass-panel p-4 border border-white/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
                  Mesa {closeModal.pedido.mesaCodigo}
                </p>
                <h3 className="text-lg font-playfair text-[var(--color-gold)] mt-1">
                  Cerrar mesa
                </h3>
                <p className="text-xs text-white/70 mt-1">
                  Elegí cómo querés cerrar. Al cerrar, la mesa desaparece de Cocina.
                </p>
              </div>

              <button
                className="rounded-full w-9 h-9 border border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                onClick={() => setCloseModal(null)}
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <Button
                variant="secondary"
                className="w-full justify-center"
                onClick={() => setCloseModal(null)}
                disabled={busyPedidoId === closeModal.pedido.id}
              >
                Cancelar
              </Button>

              <Button
                className="w-full justify-center bg-[var(--color-gold)] text-black hover:opacity-95"
                onClick={() => handleCloseMesa("print")}
                disabled={busyPedidoId === closeModal.pedido.id}
              >
                Cerrar e imprimir ticket
              </Button>

              <Button
                variant="secondary"
                className="w-full justify-center"
                onClick={() => handleCloseMesa("export")}
                disabled={busyPedidoId === closeModal.pedido.id}
              >
                Cerrar y exportar ticket
              </Button>

              <Button
                className="w-full justify-center bg-red-700 hover:bg-red-800"
                onClick={() => handleCloseMesa("no")}
                disabled={busyPedidoId === closeModal.pedido.id}
              >
                Cerrar sin ticket
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <div className="px-4 py-3 rounded-2xl bg-black/80 border border-white/10 text-sm text-white shadow-2xl">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
