"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";

  const isCocina = pathname.startsWith("/cocina");
  const isMenu = pathname === "/menu" || pathname.startsWith("/menu/");

  // Cocina: pantalla completa (sin panel, sin container angosto)
  if (isCocina) {
    return (
      <div className="min-h-screen flex flex-col w-full">
        <div className="w-full px-3 sm:px-5 py-4">
          <Header />
        </div>

        <main className="flex-1 w-full">{children}</main>
      </div>
    );
  }

  // Menu: normalmente conviene full-width también (tu /menu ya maneja su propio layout)
  if (isMenu) {
    return (
      <div className="min-h-screen flex flex-col w-full">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Header />
        </div>

        <main className="flex-1 w-full">{children}</main>

        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
          <Footer />
        </div>
      </div>
    );
  }

  // Resto: centrado con panel (como lo tenías)
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <Header />

        <main className="flex-1 mt-6 mb-8">
          <div className="glass-panel rounded-2xl p-4 sm:p-6 md:p-8">{children}</div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
