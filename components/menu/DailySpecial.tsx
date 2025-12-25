"use client";

import Card from "@/components/ui/Card";
import type { Plato, PlatoDelDiaConfig } from "@/lib/firestore";

type Props = {
  cfg: PlatoDelDiaConfig | null;
  platos: Plato[];
  loading: boolean;
};

function moneyARS(n: number) {
  try {
    return n.toLocaleString("es-AR");
  } catch {
    return String(n);
  }
}

export default function DailySpecial({ cfg, platos, loading }: Props) {
  if (loading && !cfg) {
    return (
      <Card>
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--color-text-muted)] mb-2">
          Destacado
        </p>
        <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
      </Card>
    );
  }

  if (!cfg || !cfg.activo) return null;

  const heading =
    (cfg as any)?.tituloSeccion || (cfg as any)?.etiquetaSeccion || "Plato del día";

  let titulo = "";
  let descripcion = "";
  let precio: number | undefined;

  if (cfg.modo === "automatico" && cfg.platoId) {
    const plato = platos.find((p) => p.id === cfg.platoId);
    if (plato) {
      titulo = plato.nombre;
      descripcion = plato.descripcion;
      precio = plato.precio;
    }
  }

  if (cfg.modo === "manual") {
    titulo = cfg.tituloManual || "Recomendado del chef";
    descripcion =
      cfg.descripcionManual || "Selección especial del día elaborada en el momento.";
    precio = cfg.precioManual;
  }

  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-text-muted)] mb-1">
            {heading}
          </p>

          <h2 className="font-playfair text-2xl sm:text-3xl text-[var(--color-gold)] truncate">
            {titulo}
          </h2>

          {!!descripcion && (
            <p className="text-sm sm:text-[0.95rem] text-[var(--color-text-light)] mt-2 leading-relaxed">
              {descripcion}
            </p>
          )}
        </div>

        {typeof precio === "number" && (
          <div className="text-left sm:text-right">
            <p className="text-xs text-[var(--color-text-muted)] mb-1">Precio especial</p>
            <p className="text-2xl font-semibold text-[var(--color-gold)] tabular-nums">
              ${moneyARS(precio)}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
