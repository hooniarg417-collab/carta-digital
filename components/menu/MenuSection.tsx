"use client";

import type { Plato } from "@/lib/firestore";

type Props = {
  items: Plato[];
};

function moneyARS(n: number) {
  try {
    return n.toLocaleString("es-AR");
  } catch {
    return String(n);
  }
}

export default function MenuSection({ items }: Props) {
  if (!items || items.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        No hay platos cargados en esta sección.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="
            rounded-2xl
            bg-[rgba(20,18,15,0.55)]
            border border-[rgba(255,255,255,0.06)]
            px-4 py-3
            hover:bg-[rgba(20,18,15,0.68)]
            transition-all
          "
        >
          <div className="flex items-baseline gap-3">
            <div className="min-w-0">
              <div className="text-base sm:text-lg font-medium text-[var(--color-text-light)] truncate">
                {item.nombre}
              </div>
            </div>

            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[rgba(200,169,126,0.45)] to-transparent translate-y-[-2px]" />

            <div className="shrink-0 text-base sm:text-lg font-semibold text-[var(--color-gold)] tabular-nums">
              ${moneyARS(item.precio ?? 0)}
            </div>
          </div>

          {!!item.descripcion && (
            <p className="text-sm sm:text-[0.95rem] text-[var(--color-text-muted)] mt-2 leading-relaxed">
              {item.descripcion}
            </p>
          )}

          {!!item.imagenURL && (
            <div className="mt-3 overflow-hidden rounded-xl border border-[rgba(255,255,255,0.06)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imagenURL}
                alt={item.nombre}
                className="w-full h-44 sm:h-52 object-cover"
                loading="lazy"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
