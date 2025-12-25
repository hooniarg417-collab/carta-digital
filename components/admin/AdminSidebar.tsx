"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Button from "@/components/ui/Button";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

const items = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/platos", label: "Platos" },
  { href: "/admin/categorias", label: "Categorías" },
  { href: "/admin/plato-del-dia", label: "Plato del día" },
  { href: "/admin/bloques-carta", label: "Bloques carta" }, // ✅
];

export default function AdminSidebar() {
  const pathname = usePathname();

  const logout = async () => {
    await signOut(auth);
    window.location.href = "/admin/login";
  };

  return (
    <aside className="w-full sm:w-72">
      <div className="glass-panel rounded-3xl p-4 space-y-3">
        <div className="mb-2">
          <p className="text-sm text-[var(--color-gold-light)] font-semibold">
            Panel Admin
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            Maitreya — Carta Digital
          </p>
        </div>

        <nav className="space-y-2">
          {items.map((it) => {
            const active = pathname === it.href;
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`
                  block rounded-2xl px-4 py-3 text-sm
                  border border-white/10
                  ${active ? "bg-white/10 text-white" : "bg-black/20 text-white/80 hover:bg-white/5"}
                `}
              >
                {it.label}
              </Link>
            );
          })}
        </nav>

        <Button className="w-full bg-red-700 hover:bg-red-800 text-white" onClick={logout}>
          Cerrar sesión
        </Button>
      </div>
    </aside>
  );
}
