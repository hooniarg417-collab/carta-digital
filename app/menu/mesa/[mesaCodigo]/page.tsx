"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import MenuPage from "@/app/menu/page";

const LS_KEY = "maitreya.mesaCodigo";

function normalizeMesa(v: string): string {
  return (v || "").trim().replace(/\s+/g, " ");
}

export default function MenuMesaPage() {
  const params = useParams();
  const router = useRouter();

  const raw = (params?.mesaCodigo as string) || "";
  const mesaCodigo = normalizeMesa(raw);

  useEffect(() => {
    if (!mesaCodigo) return;
    try {
      localStorage.setItem(LS_KEY, mesaCodigo);
    } catch {}
  }, [mesaCodigo]);

  // Si no vino mesaCodigo válido, mandamos a /menu normal
  useEffect(() => {
    if (!raw) router.replace("/menu");
  }, [raw, router]);

  // Renderiza el mismo menú, pero ya con mesa detectada por localStorage
  return <MenuPage />;
}
