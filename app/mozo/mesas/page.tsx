"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pedido, crearPedido, getPedidosAbiertos } from "@/lib/firestore";
import SectionTitle from "@/components/ui/SectionTitle";

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

export default function MozoMesasPage() {
  const router = useRouter();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // formulario para abrir mesa
  const [mesaCodigo, setMesaCodigo] = useState("");
  const [mesaNombre, setMesaNombre] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const cargarPedidos = async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await getPedidosAbiertos();
      setPedidos(data);
    } catch (e) {
      console.error("Error cargando pedidos abiertos:", e);
      setError("No se pudieron cargar las mesas abiertas.");
    } finally {
      setLoading(false);
      setFormLoading(false);
    }
  };

  useEffect(() => {
    cargarPedidos();
  }, []);

  const pedidosOrdenados = useMemo(() => {
    // ✅ Orden cronológico: más antigua arriba
    return [...pedidos].sort((a, b) => toMillis(a.creadoEn) - toMillis(b.creadoEn));
  }, [pedidos]);

  const handleCrearMesa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!mesaCodigo.trim()) {
      setError("Debes ingresar un código de mesa (ej: 4, M4, Terraza1).");
      return;
    }

    try {
      setFormLoading(true);

      await crearPedido({
        mesaCodigo: mesaCodigo.trim(),
        mesaNombre: mesaNombre.trim() || undefined,
      });

      setMesaCodigo("");
      setMesaNombre("");
      await cargarPedidos();
    } catch (e) {
      console.error("Error creando mesa/pedido:", e);
      setError("No se pudo abrir la mesa.");
      setFormLoading(false);
    }
  };

  const irADetalleMesa = (mesaCodigo: string) => {
    router.push(`/mozo/mesa/${encodeURIComponent(mesaCodigo)}`);
  };

  return (
    <div className="max-w-4xl mx-auto w-full px-3 sm:px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
      <header className="space-y-1">
        <p className="text-[0.7rem] tracking-[0.35em] uppercase text-[var(--color-text-muted)]">
          Panel interno
        </p>
        <h1 className="text-2xl sm:text-3xl font-playfair font-semibold text-[var(--color-gold)]">
          Mesas / Mozo
        </h1>
        <p className="text-xs sm:text-sm text-[var(--color-text-muted)]">
          Abrir y gestionar mesas activas del salón (el cierre e impresión se realizan desde cocina).
        </p>
      </header>

      <div className="glass-panel rounded-3xl p-4 sm:p-5 space-y-3 border border-[rgba(200,169,126,0.35)]">
        <SectionTitle>Abrir nueva mesa</SectionTitle>

        <form onSubmit={handleCrearMesa} className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1 space-y-1">
            <label className="block text-[0.7rem] text-[var(--color-text-muted)]">
              Código de mesa (obligatorio)
            </label>
            <input
              type="text"
              value={mesaCodigo}
              onChange={(e) => setMesaCodigo(e.target.value)}
              placeholder="Ej: 4, 4B, M1, Terraza1"
              className="
                w-full rounded-xl bg-[rgba(10,9,8,0.9)]
                border border-[rgba(120,120,120,0.5)]
                px-3 py-2 text-xs sm:text-sm
                text-[var(--color-text)]
                focus:outline-none focus:border-[var(--color-gold)]
              "
            />
          </div>

          <div className="flex-1 space-y-1">
            <label className="block text-[0.7rem] text-[var(--color-text-muted)]">
              Descripción / nombre (opcional)
            </label>
            <input
              type="text"
              value={mesaNombre}
              onChange={(e) => setMesaNombre(e.target.value)}
              placeholder="Ej: Ventana, Terraza pareja, Patio VIP"
              className="
                w-full rounded-xl bg-[rgba(10,9,8,0.9)]
                border border-[rgba(120,120,120,0.5)]
                px-3 py-2 text-xs sm:text-sm
                text-[var(--color-text)]
                focus:outline-none focus:border-[var(--color-gold)]
              "
            />
          </div>

          <button
            type="submit"
            disabled={formLoading}
            className="
              px-4 py-2.5 rounded-full text-xs sm:text-sm font-medium
              bg-[var(--color-gold)]
              text-black
              hover:bg-[var(--color-gold-light)]
              disabled:opacity-60 disabled:cursor-not-allowed
              transition-all
            "
          >
            {formLoading ? "Abriendo..." : "Abrir mesa"}
          </button>
        </form>

        <p className="text-[0.65rem] text-[var(--color-text-muted)]">
          El código de mesa debería coincidir con el usado en el QR del cliente (ej:{" "}
          <span className="font-mono text-[0.65rem]">/menu?mesa=4</span>).
        </p>
      </div>

      {error && (
        <div className="glass-panel rounded-2xl p-3 text-xs text-red-400 border border-red-500/40">
          {error}
        </div>
      )}

      <div className="glass-panel rounded-3xl p-4 sm:p-5 space-y-3">
        <SectionTitle>Mesas abiertas</SectionTitle>

        <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
          <span>
            Total:{" "}
            <span className="font-semibold text-[var(--color-gold-light)]">
              {pedidosOrdenados.length}
            </span>
          </span>
          <button
            onClick={cargarPedidos}
            disabled={loading}
            className="
              px-3 py-1.5 rounded-full text-[0.7rem] font-medium
              bg-[rgba(20,18,15,0.9)]
              text-[var(--color-gold-light)]
              border border-[rgba(200,169,126,0.5)]
              hover:bg-[var(--color-gold)] hover:text-black
              disabled:opacity-60 disabled:cursor-not-allowed
              transition-all
            "
          >
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
        </div>

        {loading && (
          <p className="text-xs text-[var(--color-text-muted)]">Cargando mesas abiertas...</p>
        )}

        {!loading && pedidosOrdenados.length === 0 && (
          <p className="text-xs text-[var(--color-text-muted)]">
            No hay mesas abiertas en este momento.
          </p>
        )}

        <div className="space-y-3">
          {pedidosOrdenados.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl bg-[rgba(10,9,8,0.9)] border border-[rgba(120,120,120,0.45)] px-3 py-3 text-xs sm:text-[0.8rem] space-y-2"
            >
              <div className="flex justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-[0.8rem] font-semibold text-[var(--color-gold-light)]">
                    Mesa {p.mesaCodigo}
                  </span>

                  {p.mesaNombre && (
                    <span className="text-[0.65rem] text-[var(--color-text-muted)]">
                      {p.mesaNombre}
                    </span>
                  )}

                  <span className="text-[0.65rem] text-white/55 mt-1">
                    Apertura: <span className="text-white/75">{fmtDT(p.creadoEn)}</span>
                  </span>

                  <span className="text-[0.6rem] text-[var(--color-text-muted)] mt-1">
                    Estado:{" "}
                    <span className="uppercase">
                      {p.estadoMesa === "abierto" ? "Abierta" : "Cerrada"}
                    </span>
                  </span>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <div className="flex flex-wrap justify-end gap-1">
                    {p.llamoMozo && (
                      <span className="px-2 py-[2px] rounded-full text-[0.6rem] bg-amber-500/20 text-amber-300 border border-amber-400/40">
                        Llamó al mozo
                      </span>
                    )}
                    {p.pidioCuenta && (
                      <span className="px-2 py-[2px] rounded-full text-[0.6rem] bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                        Pidió la cuenta
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => irADetalleMesa(p.mesaCodigo)}
                  className="
                    px-3 py-1.5 rounded-full text-[0.7rem] font-medium
                    bg-[var(--color-gold)]
                    text-black
                    hover:bg-[var(--color-gold-light)]
                    transition-all
                  "
                >
                  Ver mesa / cargar pedido
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
