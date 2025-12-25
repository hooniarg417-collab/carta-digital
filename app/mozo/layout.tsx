"use client";

export default function MozoLayout({ children }: { children: React.ReactNode }) {
  return (
    // "Full-bleed" para romper el glass-panel + padding que mete app/layout.tsx
    <div className="-m-4 sm:-m-6 md:-m-8 lg:-m-8">
      {/* Skin Mozo: oscuro operativo, alto contraste, fácil en celular */}
      <div
        className="
          min-h-[calc(100vh-0px)]
          bg-[linear-gradient(180deg,rgba(8,8,8,0.92),rgba(12,10,8,0.96))]
          text-[var(--color-text-light)]
        "
      >
        {/* Contenedor operativo */}
        <div className="max-w-5xl mx-auto w-full px-3 sm:px-5 py-5 sm:py-7">
          {/* Marco/superficie principal (más sólido y menos “artístico”) */}
          <div
            className="
              rounded-3xl
              bg-[rgba(10,9,8,0.92)]
              border border-[rgba(120,120,120,0.35)]
              shadow-[0_18px_60px_rgba(0,0,0,0.65)]
              backdrop-blur-md
              p-3 sm:p-5
            "
          >
            {children}
          </div>

          {/* Pie operativo chico */}
          <div className="mt-4 text-[0.65rem] text-[rgba(200,191,181,0.8)]">
            Modo Mozo · UI operativa (oscura) · Optimizada para teléfono
          </div>
        </div>
      </div>
    </div>
  );
}
