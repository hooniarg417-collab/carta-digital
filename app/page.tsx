"use client";

import Link from "next/link";
import SectionTitle from "@/components/ui/SectionTitle";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="max-w-3xl w-full glass-panel rounded-3xl p-6 sm:p-10 border border-[rgba(200,169,126,0.35)] space-y-8">
        {/* Header marca */}
        <header className="text-center space-y-2">
          <p className="text-[0.7rem] tracking-[0.35em] uppercase text-[var(--color-text-muted)]">
            Carta digital • Gestión de salón
          </p>
          <h1 className="text-3xl sm:text-4xl font-playfair font-semibold text-[var(--color-gold)]">
            Maitreya – Patagonia Gourmet
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] max-w-xl mx-auto">
            Sistema integrado de carta digital, pedidos en mesa y panel interno
            para mozos y cocina. Diseñado para restaurantes que quieren agilidad
            sin perder elegancia.
          </p>
        </header>

        {/* Bloque de acciones principales */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Carta cliente */}
          <div className="rounded-2xl bg-[rgba(10,9,8,0.9)] border border-[rgba(200,169,126,0.45)] p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <SectionTitle>Carta digital</SectionTitle>
              <p className="mt-2 text-[0.8rem] text-[var(--color-text-muted)]">
                Vista que usaría el cliente desde el QR en la mesa. Muestra la
                carta y permite llamar al mozo o pedir la cuenta.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/menu"
                className="
                  px-4 py-2 rounded-full text-xs sm:text-sm font-medium
                  bg-[var(--color-gold)]
                  text-black
                  hover:bg-[var(--color-gold-light)]
                  transition-all
                "
              >
                Ver carta (demo)
              </Link>
              <p className="text-[0.65rem] text-[var(--color-text-muted)]">
                URL típica para QR:{" "}
                <span className="font-mono">
                  /menu?mesa=4
                </span>
              </p>
            </div>
          </div>

          {/* Panel interno */}
          <div className="rounded-2xl bg-[rgba(10,9,8,0.9)] border border-[rgba(200,169,126,0.45)] p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <SectionTitle>Panel interno</SectionTitle>
              <p className="mt-2 text-[0.8rem] text-[var(--color-text-muted)]">
                Acceso para el equipo: abrir mesas, cargar pedidos, ver
                estados en cocina y generar el ticket de la mesa.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/admin/login"
                className="
                  px-4 py-2 rounded-full text-xs sm:text-sm font-medium
                  bg-[rgba(20,18,15,0.9)]
                  text-[var(--color-gold-light)]
                  border border-[rgba(200,169,126,0.5)]
                  hover:bg-[var(--color-gold)] hover:text-black
                  transition-all
                "
              >
                Entrar al panel administrativo
              </Link>
              <p className="text-[0.65rem] text-[var(--color-text-muted)]">
                Luego del login podés ir a{" "}
                <span className="font-mono">Mozo / Mesas</span> y{" "}
                <span className="font-mono">Cocina / Barra</span>.
              </p>
            </div>
          </div>
        </section>

        {/* Footer chiquito */}
        <footer className="text-center text-[0.65rem] text-[var(--color-text-muted)]">
          Demo funcional – Maitreya Carta · Construido con Next.js y Firebase
        </footer>
      </div>
    </main>
  );
}
