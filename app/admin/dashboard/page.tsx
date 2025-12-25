"use client";

import Link from "next/link";
import SectionTitle from "@/components/ui/SectionTitle";

export default function AdminDashboardPage() {
  const atajos = [
    {
      titulo: "Mesas / Mozo",
      subtitulo: "Gestión de salón",
      descripcion:
        "Abrir mesas, cargar ítems al pedido y ver el consumo actual de cada mesa.",
      href: "/mozo/mesas",
      tag: "Vista operativo",
    },
    {
      titulo: "Cocina / Barra",
      subtitulo: "Flujo de pedidos",
      descripcion:
        "Ver pedidos pendientes, en preparación, listos y entregados, con opción de imprimir ticket.",
      href: "/cocina",
      tag: "Vista producción",
    },
    {
      titulo: "Carta y configuración",
      subtitulo: "Platos, categorías, plato del día",
      descripcion:
        "Administrar categorías, platos, precios e imagen del plato del día.",
      href: "/admin/platos", // podés cambiar a /admin/categorias si preferís
      tag: "Configuración",
    },
  ];

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      {/* Encabezado */}
      <header className="space-y-2">
        <p className="text-[0.7rem] tracking-[0.35em] uppercase text-[var(--color-text-muted)]">
          Panel interno
        </p>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-playfair font-semibold text-[var(--color-gold)]">
          Dashboard administrativo
        </h1>
        <p className="text-xs sm:text-sm text-[var(--color-text-muted)] max-w-xl">
          Desde aquí podés acceder a las vistas de mozo, cocina/barra y a la
          configuración completa de la carta digital.
        </p>
      </header>

      {/* Tarjetas principales */}
      <div
        className="
          grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
          gap-4 sm:gap-5
        "
      >
        {atajos.map((card) => (
          <Link
            key={card.titulo}
            href={card.href}
            className="
              group relative rounded-3xl border border-[rgba(200,169,126,0.28)]
              bg-[rgba(10,9,8,0.96)]/90
              px-4 py-4 sm:px-5 sm:py-6
              flex flex-col justify-between
              shadow-[0_18px_40px_rgba(0,0,0,0.55)]
              transition-all duration-200
              hover:-translate-y-[3px]
              hover:border-[var(--color-gold)]
              hover:shadow-[0_22px_50px_rgba(0,0,0,0.75)]
            "
          >
            <div className="space-y-2 sm:space-y-3">
              <span className="inline-flex px-2 py-[2px] rounded-full text-[0.6rem] tracking-wide uppercase border border-[rgba(200,169,126,0.45)] text-[var(--color-gold-light)]">
                {card.tag}
              </span>

              <div>
                <h2 className="font-playfair text-xl sm:text-2xl text-[var(--color-gold)] leading-tight">
                  {card.titulo}
                </h2>
                <p className="text-[0.75rem] sm:text-[0.8rem] text-[var(--color-text-muted)] mt-1">
                  {card.subtitulo}
                </p>
              </div>

              <p className="text-[0.7rem] sm:text-[0.8rem] text-[var(--color-text-muted)] leading-relaxed">
                {card.descripcion}
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between text-[0.75rem]">
              <span className="text-[var(--color-text-muted)]">
                Entrar al módulo
              </span>
              <span
                className="
                  inline-flex items-center gap-1
                  text-[0.75rem] font-medium
                  text-[var(--color-gold-light)]
                  group-hover:text-[var(--color-gold)]
                "
              >
                Abrir
                <span className="translate-y-[1px] group-hover:translate-x-[2px] transition-transform">
                  →
                </span>
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Bloque informativo inferior (opcional) */}
      <div className="mt-4 glass-panel rounded-3xl p-4 sm:p-5 border border-[rgba(120,120,120,0.35)]">
        <SectionTitle>Atajos rápidos</SectionTitle>
        <p className="text-[0.7rem] sm:text-xs text-[var(--color-text-muted)] leading-relaxed">
          Podés dejar esta vista fija en una pantalla del bar o de la caja para
          abrir rápidamente{" "}
          <span className="text-[var(--color-gold-light)]">
            Mesas / Mozo
          </span>
          ,{" "}
          <span className="text-[var(--color-gold-light)]">
            Cocina / Barra
          </span>{" "}
          o{" "}
          <span className="text-[var(--color-gold-light)]">
            Carta y configuración
          </span>
          . Cada tarjeta es completamente clickeable.
        </p>
      </div>
    </div>
  );
}
