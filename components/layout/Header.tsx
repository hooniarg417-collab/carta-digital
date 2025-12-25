"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Inicio" },
  { href: "/menu", label: "Carta" },
  { href: "/admin/login", label: "Administración" },
];

// Editá esto a gusto
const DIRECCION_PUBLICA = "Neuquén • Patagonia Gourmet";

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Header() {
  const pathname = usePathname() || "/";

  const isMenu = pathname === "/menu" || pathname.startsWith("/menu/");
  const isCocina = pathname.startsWith("/cocina");

  // En menu y cocina ocultamos la navegación principal
  const showNav = !isMenu && !isCocina;

  return (
    <header className="flex items-center justify-between gap-4">
      {/* Logo / Nombre */}
      <div className="flex flex-col leading-tight">
        <h1 className="font-playfair text-2xl sm:text-3xl tracking-[0.12em] text-[var(--color-gold)]">
          Maitreya
        </h1>
        <span className="text-[0.65rem] tracking-[0.35em] uppercase text-[var(--color-text-muted)]">
          by Patagonia Gourmet
        </span>
      </div>

      {/* En /menu mostramos dirección (no navegación) */}
      {isMenu && (
        <div className="text-[0.7rem] sm:text-xs tracking-[0.18em] uppercase text-[var(--color-text-muted)] text-right">
          {DIRECCION_PUBLICA}
        </div>
      )}

      {/* Navegación desktop */}
      {showNav && (
        <nav className="hidden sm:flex items-center gap-6 text-xs">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`
                  uppercase tracking-[0.18em] transition-colors
                  ${
                    active
                      ? "text-[var(--color-gold-light)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-gold-light)]"
                  }
                `}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}

      {/* Versión mobile */}
      {!isMenu && !isCocina && (
        <div className="sm:hidden text-xs">
          <Link
            href="/menu"
            className="uppercase tracking-[0.2em] text-[var(--color-gold-light)]"
          >
            Ver carta
          </Link>
        </div>
      )}
    </header>
  );
}
