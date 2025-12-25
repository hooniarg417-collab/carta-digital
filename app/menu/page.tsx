"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import SectionTitle from "@/components/ui/SectionTitle";
import DailySpecial from "@/components/menu/DailySpecial";
import MenuSection from "@/components/menu/MenuSection";
import type { Categoria, Plato, PlatoDelDiaConfig } from "@/lib/firestore";
import {
  getCategorias,
  getPlatos,
  getPlatoDelDia,
  marcarLlamoMozo,
  marcarPidioCuenta,
  getMenuBlocks,
} from "@/lib/firestore";

type CategoriaConPlatos = Categoria & { platos: Plato[] };

type MenuBlockTipo = "plato" | "manual";
type MenuBlock = {
  id: string;
  activo: boolean;
  orden: number;
  tipo: MenuBlockTipo;
  titulo: string;
  descripcion?: string;
  precioManual?: number;
  imagenURL?: string | null;
  platoId?: string;
};

function normalizeMesa(raw: string | null): string {
  const v = (raw || "").trim();
  if (!v) return "";
  return v.replace(/\s+/g, " ");
}

const LS_KEY = "maitreya.mesaCodigo";

/** ✅ Assets estéticos (en /public) */
const AMBIENT_BG_URL = "/menu-ambient.jpg"; // fondo exterior blur (EXTERIOR)
const HERO_LOGO_URL = "/menu-hero.jpg"; // “banner = logo” (INTERIOR del recuadro)

export default function MenuPage() {
  const searchParams = useSearchParams();

  const mesaFromQuery = useMemo(() => {
    const v =
      searchParams.get("mesa") ||
      searchParams.get("m") ||
      searchParams.get("table") ||
      "";
    return normalizeMesa(v);
  }, [searchParams]);

  const [mesaCodigo, setMesaCodigo] = useState<string>("");

  useEffect(() => {
    if (mesaFromQuery) {
      setMesaCodigo(mesaFromQuery);
      try {
        localStorage.setItem(LS_KEY, mesaFromQuery);
      } catch {}
      return;
    }

    try {
      const saved = normalizeMesa(localStorage.getItem(LS_KEY));
      if (saved) setMesaCodigo(saved);
    } catch {}
  }, [mesaFromQuery]);

  const [categorias, setCategorias] = useState<CategoriaConPlatos[]>([]);
  const [platoDelDiaCfg, setPlatoDelDiaCfg] = useState<PlatoDelDiaConfig | null>(null);
  const [menuBlocks, setMenuBlocks] = useState<MenuBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [accionLoading, setAccionLoading] = useState<null | "mozo" | "cuenta">(null);
  const [toast, setToast] = useState<string | null>(null);

  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // ✅ Panel flotante fijo (sin botón)
  const [panelOpen, setPanelOpen] = useState(true);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        setError(null);

        const [catsRaw, platosRaw, cfg, blocksRaw] = await Promise.all([
          getCategorias(),
          getPlatos(),
          getPlatoDelDia(),
          getMenuBlocks(),
        ]);

        const cats = catsRaw
          .filter((c: Categoria) => c.activa !== false)
          .sort((a, b) => (a.orden ?? 9999) - (b.orden ?? 9999));

        const platos = platosRaw.filter((p: Plato) => p.activo !== false);

        const byCat: Record<string, Plato[]> = {};
        platos.forEach((p) => {
          const catId = p.categoriaId || "";
          if (!byCat[catId]) byCat[catId] = [];
          byCat[catId].push(p);
        });

        const categoriasConPlatos: CategoriaConPlatos[] = cats.map((cat) => ({
          ...cat,
          platos: (byCat[cat.id] ?? []).sort(
            (a, b) => (a.orden ?? 9999) - (b.orden ?? 9999)
          ),
        }));

        const sinCategoria = (byCat[""] ?? []).sort(
          (a, b) => (a.orden ?? 9999) - (b.orden ?? 9999)
        );
        if (sinCategoria.length > 0) {
          categoriasConPlatos.push({
            id: "__general__",
            nombre: "General",
            activa: true,
            orden: 9999,
            platos: sinCategoria,
          });
        }

        const blocks = (blocksRaw as any[])
          .filter((b) => b?.activo !== false)
          .sort((a, b) => (a?.orden ?? 9999) - (b?.orden ?? 9999));

        setCategorias(categoriasConPlatos);
        setPlatoDelDiaCfg(cfg ?? null);
        setMenuBlocks(blocks as MenuBlock[]);
      } catch (e) {
        console.error("Error cargando carta:", e);
        setError("No se pudo cargar la carta.");
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // ✅ Cerrar panel con ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanelOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const scrollToCategory = (id: string) => {
    const section = sectionRefs.current[id];
    if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const todosLosPlatos: Plato[] = categorias.flatMap((c) => c.platos);

  const onLlamarMozo = async () => {
    if (!mesaCodigo) {
      setToast("No se detectó la mesa (QR).");
      return;
    }
    try {
      setAccionLoading("mozo");
      await marcarLlamoMozo(mesaCodigo);
      setToast(`✅ Mesa ${mesaCodigo}: se avisó al mozo.`);
    } catch (e) {
      console.error(e);
      setToast("Error: no se pudo avisar al mozo.");
    } finally {
      setAccionLoading(null);
    }
  };

  const onPedirCuenta = async () => {
    if (!mesaCodigo) {
      setToast("No se detectó la mesa (QR).");
      return;
    }
    try {
      setAccionLoading("cuenta");
      await marcarPidioCuenta(mesaCodigo);
      setToast(`✅ Mesa ${mesaCodigo}: se pidió la cuenta.`);
    } catch (e) {
      console.error(e);
      setToast("Error: no se pudo pedir la cuenta.");
    } finally {
      setAccionLoading(null);
    }
  };

  const renderBlock = (b: MenuBlock) => {
    let titulo = b.titulo || "";
    let descripcion = b.descripcion || "";
    let precio: number | undefined =
      typeof b.precioManual === "number" ? b.precioManual : undefined;

    if (b.tipo === "plato" && b.platoId) {
      const plato = todosLosPlatos.find((p) => p.id === b.platoId);
      if (plato) {
        titulo = b.titulo || plato.nombre;
        descripcion = plato.descripcion || "";
        precio = plato.precio;
      }
    }

    return (
      <div
        key={b.id}
        className="glass-panel rounded-3xl p-4 sm:p-6 space-y-3 animate-fadeIn overflow-hidden"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
              Destacado
            </p>
            <h2 className="font-playfair text-2xl sm:text-3xl text-[var(--color-gold)] truncate">
              {titulo}
            </h2>
            {!!descripcion && (
              <p className="text-sm sm:text-[0.95rem] text-[var(--color-text-light)] mt-2 leading-relaxed">
                {descripcion}
              </p>
            )}
          </div>

          {typeof precio === "number" && (
            <div className="shrink-0 text-right">
              <p className="text-xs text-[var(--color-text-muted)] mb-1">Precio</p>
              <p className="text-2xl font-semibold text-[var(--color-gold)] tabular-nums">
                ${precio.toLocaleString("es-AR")}
              </p>
            </div>
          )}
        </div>

        {!!b.imagenURL && (
          <div className="mt-2 overflow-hidden rounded-2xl border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={b.imagenURL}
              alt={titulo}
              className="w-full h-48 sm:h-60 object-cover"
              loading="lazy"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full relative">
      {/* ✅ EXTERIOR: Fondo con menu-ambient.jpg (blur + viñeta) */}
      <div className="fixed inset-0 -z-10">
        <div
          className="absolute inset-0 scale-[0.90] blur-[2px] opacity-[1.00]"
          style={{
            backgroundImage: `url(${AMBIENT_BG_URL})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-black/45" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(70% 55% at 50% 35%, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.58) 62%, rgba(0,0,0,0.86) 100%)",
          }}
        />
      </div>

      <div className="max-w-5xl mx-auto w-full space-y-6 sm:space-y-8 pb-24 px-3 sm:px-6">
        <header className="space-y-4">
          {/* ✅ INTERIOR: Recuadro “hero” usando SOLO menu-hero.jpg (banner=logo) */}
          <div className="rounded-3xl overflow-hidden h-44 sm:h-56 w-full shadow-[0_18px_40px_rgba(0,0,0,0.6)] relative">
            {/* Imagen del logo/hero */}
            <div className="absolute inset-0 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={HERO_LOGO_URL}
                alt="Maitreya"
                className="w-full h-full object-cover select-none"
                loading="eager"
                style={{
                  filter: "contrast(1.02) saturate(1.02)",
                  WebkitMaskImage:
                    "radial-gradient(75% 80% at 50% 50%, rgba(0,0,0,1) 62%, rgba(0,0,0,0.2) 82%, rgba(0,0,0,0) 100%)",
                  maskImage:
                    "radial-gradient(75% 80% at 50% 50%, rgba(0,0,0,1) 62%, rgba(0,0,0,0.2) 82%, rgba(0,0,0,0) 100%)",
                }}
              />
            </div>

            {/* Overlay para “fusionar” bordes */}
            <div className="absolute inset-0 bg-black/22" />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(60% 70% at 50% 50%, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.55) 85%, rgba(0,0,0,0.80) 100%)",
              }}
            />
          </div>

          {/* Textos */}
          <div className="text-center space-y-1">
            <h1 className="text-3xl sm:text-4xl font-playfair font-semibold text-[var(--color-gold)]">
              Maitreya
            </h1>
            <p className="text-[0.7rem] tracking-[0.35em] uppercase text-[var(--color-text-muted)]">
              by Patagonia Gourmet
            </p>

            {mesaCodigo ? (
              <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
                Mesa{" "}
                <span className="text-[var(--color-gold-light)] font-semibold">
                  {mesaCodigo}
                </span>
              </p>
            ) : (
              <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
                Carta digital pensada para acompañar la experiencia.
              </p>
            )}
          </div>
        </header>

        {menuBlocks.length > 0 && (
          <div className="space-y-4">{menuBlocks.map(renderBlock)}</div>
        )}

        <div className="glass-panel rounded-3xl px-3 py-3 sm:px-4 sm:py-4 space-y-4">
          <div className="flex items-center justify-between gap-3 text-xs text-[var(--color-text-muted)]">
            <span>Categorías</span>
            {loading ? <span>Cargando…</span> : <span>{categorias.length} secciones</span>}
          </div>

          <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
            {error ? (
              <div className="h-10 flex items-center justify-center text-xs text-red-400">
                {error}
              </div>
            ) : !categorias.length && !loading ? (
              <div className="h-10 flex items-center justify-center text-xs text-[var(--color-text-muted)]">
                Aún no hay platos cargados.
              </div>
            ) : (
              <div className="flex gap-2 pb-1">
                {categorias.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => scrollToCategory(cat.id)}
                    className="
                      px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap
                      bg-[rgba(20,18,15,0.85)]
                      text-[var(--color-gold-light)]
                      border border-[rgba(200,169,126,0.35)]
                      hover:bg-[var(--color-gold)] hover:text-black
                      transition-all
                    "
                  >
                    {cat.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <DailySpecial cfg={platoDelDiaCfg} platos={todosLosPlatos} loading={loading} />

        {categorias.map((cat) => (
          <section
            key={cat.id}
            ref={(el: HTMLDivElement | null) => {
              sectionRefs.current[cat.id] = el;
            }}
            className="glass-panel rounded-3xl p-4 sm:p-6 space-y-4 animate-fadeIn"
          >
            <SectionTitle>{cat.nombre}</SectionTitle>
            <MenuSection items={cat.platos} />
          </section>
        ))}
      </div>

      {/* ✅ Panel flotante fijo (sin botón) */}
      {mesaCodigo && panelOpen && (
        <div className="fixed bottom-5 right-5 z-50">
          <div
            ref={panelRef}
            className="w-[min(340px,90vw)] rounded-3xl bg-black/70 border border-white/10 backdrop-blur-xl shadow-2xl p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
                Acciones Mesa {mesaCodigo}
              </p>
              <button
                onClick={() => setPanelOpen(false)}
                className="w-9 h-9 rounded-full bg-white/10 border border-white/10 hover:bg-white/15 transition-all grid place-items-center"
                aria-label="Cerrar"
                title="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <button
                onClick={onLlamarMozo}
                disabled={accionLoading !== null}
                className="
                  w-full px-4 py-3 rounded-2xl text-sm font-semibold
                  bg-[var(--color-gold)] text-black
                  hover:opacity-95
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all
                "
              >
                {accionLoading === "mozo" ? "Avisando…" : "Llamar mozo"}
              </button>

              <button
                onClick={onPedirCuenta}
                disabled={accionLoading !== null}
                className="
                  w-full px-4 py-3 rounded-2xl text-sm font-semibold
                  bg-white/10 text-white
                  border border-white/15
                  hover:bg-white/15
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all
                "
              >
                {accionLoading === "cuenta" ? "Avisando…" : "Pedir cuenta"}
              </button>
            </div>

            <p className="text-[0.65rem] text-[var(--color-text-muted)] mt-3">
              Podés cerrarlo con <span className="font-semibold">Esc</span>.
            </p>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <div className="px-4 py-3 rounded-2xl bg-black/80 border border-white/10 text-sm text-white shadow-2xl">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
