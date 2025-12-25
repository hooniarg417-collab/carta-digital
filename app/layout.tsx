// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import ClientShell from "@/components/layout/ClientShell";

export const metadata: Metadata = {
  title: "Maitreya - Carta Digital",
  description: "Carta digital de Maitreya by Patagonia Gourmet",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen text-[var(--color-text-light)]">
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}

