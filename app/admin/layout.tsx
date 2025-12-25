"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // Esta ruta es el login: NO debe estar protegida por este layout
  const isLoginRoute = pathname === "/admin/login";

  useEffect(() => {
    // Para /admin/login, no chequeamos sesión ni redirigimos
    if (isLoginRoute) {
      setChecking(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        // Si no hay usuario, mandamos al login,
        // guardando a dónde quería ir.
        const redirect = encodeURIComponent(pathname || "/admin/dashboard");
        router.push(`/admin/login?redirect=${redirect}`);
      } else {
        setUser(u);
        setChecking(false);
      }
    });

    return () => unsub();
  }, [router, pathname, isLoginRoute]);

  // En login: mostramos la página tal cual, sin sidebar ni spinner
  if (isLoginRoute) {
    return <>{children}</>;
  }

  // Mientras chequeamos sesión en rutas protegidas
  if (checking) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-xs text-[var(--color-text-muted)]">
        Verificando acceso...
      </div>
    );
  }

  // Resto del admin, con sidebar
  return (
    <div className="min-h-[60vh] flex gap-6">
      <AdminSidebar />
      <div className="flex-1 rounded-2xl p-4 sm:p-6 lg:p-8">{children}</div>
    </div>
  );
}
