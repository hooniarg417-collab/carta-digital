"use client";

import { useEffect, useMemo, useState } from "react";
import type { MenuBlock, Plato } from "@/lib/firestore";
import {
  getMenuBlocks,
  createMenuBlock,
  updateMenuBlock,
  deleteMenuBlock,
  getPlatos,
} from "@/lib/firestore";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

type Tipo = "manual" | "plato";

function parsePrecio(raw: string): number | undefined {
  const v = raw.trim().replace(",", ".");
  if (!v) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

function normalizeUrl(raw: string): string {
  const v = (raw || "").trim();
  if (!v) return "";
  return v;
}

export default function BloquesCartaPage() {
  const [blocks, setBlocks] = useState<MenuBlock[]>([]);
  const [platos, setPlatos] = useState<Plato[]>([]);
  const [loading, setLoading] = useState(true);

  // form
  const [tipo, setTipo] = useState<Tipo>("manual");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [platoId, setPlatoId] = useState("");
  const [imagenURL, setImagenURL] = useState(""); // ✅ NUEVO

  const [editId, setEditId] = useState<string | null>(null);

  const blocksOrdenados = useMemo(() => {
    return [...blocks].sort((a, b) => (a.orden ?? 9999) - (b.orden ?? 9999));
  }, [blocks]);

  const cargar = async () => {
    setLoading(true);
    const [b, p] = await Promise.all([getMenuBlocks(), getPlatos()]);
    setBlocks(b);
    setPlatos(p.filter((x) => x.activo !== false));
    setLoading(false);
  };

  useEffect(() => {
    cargar();
  }, []);

  const limpiarForm = () => {
    setTipo("manual");
    setTitulo("");
    setDescripcion("");
    setPrecio("");
    setPlatoId("");
    setImagenURL("");
    setEditId(null);
  };

  const guardar = async () => {
    const t = titulo.trim();
    if (!t) {
      alert("El título es obligatorio.");
      return;
    }

    if (tipo === "plato" && !platoId) {
      alert("Seleccioná un plato.");
      return;
    }

    const precioNum = tipo === "manual" ? parsePrecio(precio) : undefined;

    const img = normalizeUrl(imagenURL);
    const payload: any = {
      tipo,
      titulo: t,
      descripcion: tipo === "manual" ? descripcion.trim() : "",
      precioManual: tipo === "manual" ? precioNum : undefined,
      platoId: tipo === "plato" ? platoId : undefined,
      imagenURL: img ? img : null, // ✅
    };

    if (editId) {
      await updateMenuBlock(editId, payload);
    } else {
      await createMenuBlock({
        ...payload,
        activo: true,
      });
    }

    limpiarForm();
    await cargar();
  };

  const editar = (b: MenuBlock) => {
    setEditId(b.id);
    setTipo(b.tipo as Tipo);
    setTitulo(b.titulo);
    setDescripcion(b.descripcion || "");
    setPrecio(typeof b.precioManual === "number" ? String(b.precioManual) : "");
    setPlatoId(b.platoId || "");
    setImagenURL((b as any).imagenURL || ""); // ✅
  };

  const mover = async (b: MenuBlock, dir: "up" | "down") => {
    const ordenados = blocksOrdenados;
    const idx = ordenados.findIndex((x) => x.id === b.id);
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= ordenados.length) return;

    const other = ordenados[target];

    const ordA = typeof b.orden === "number" ? b.orden : idx + 1;
    const ordB = typeof other.orden === "number" ? other.orden : target + 1;

    await Promise.all([
      updateMenuBlock(b.id, { orden: ordB }),
      updateMenuBlock(other.id, { orden: ordA }),
    ]);

    await cargar();
  };

  const toggleActivo = async (b: MenuBlock) => {
    await updateMenuBlock(b.id, { activo: !b.activo });
    await cargar();
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar este bloque?")) return;
    await deleteMenuBlock(id);
    await cargar();
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-playfair text-[var(--color-gold)]">
        Bloques destacados de la carta
      </h1>

      <Card>
        <h2 className="font-playfair text-xl mb-4 text-[var(--color-gold-light)]">
          {editId ? "Editar bloque" : "Nuevo bloque"}
        </h2>

        <div className="space-y-4">
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" checked={tipo === "manual"} onChange={() => setTipo("manual")} />
              Bloque manual
            </label>

            <label className="flex items-center gap-2">
              <input type="radio" checked={tipo === "plato"} onChange={() => setTipo("plato")} />
              Usar plato existente
            </label>
          </div>

          <div>
            <label className="text-xs text-[var(--color-text-muted)]">Título visible</label>
            <Input
              value={titulo}
              onChange={(e: any) => setTitulo(e.target.value)}
              placeholder="Ej: Recomendado del Chef / Promo / Plato del Día"
            />
          </div>

          {/* ✅ Imagen configurable (URL) */}
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">
              Imagen (URL) — opcional
            </label>
            <Input
              value={imagenURL}
              onChange={(e: any) => setImagenURL(e.target.value)}
              placeholder="https://... (Firebase Storage / Cloudinary / etc.)"
            />
            {normalizeUrl(imagenURL) ? (
              <div className="mt-3 overflow-hidden rounded-2xl border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={normalizeUrl(imagenURL)}
                  alt="Preview"
                  className="w-full h-44 object-cover"
                  loading="lazy"
                />
              </div>
            ) : null}
          </div>

          {tipo === "plato" ? (
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">Plato</label>
              <select
                value={platoId}
                onChange={(e) => setPlatoId(e.target.value)}
                className="w-full p-3 rounded-lg bg-[rgba(255,255,255,0.05)]
                border border-[rgba(200,169,126,0.35)]
                text-[var(--color-text-light)]"
              >
                <option value="">Seleccionar…</option>
                {platos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} — ${p.precio.toLocaleString("es-AR")}
                  </option>
                ))}
              </select>

              <p className="text-[0.7rem] text-[var(--color-text-muted)] mt-2">
                Tip: el título puede “pisar” el nombre del plato si querés.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs text-[var(--color-text-muted)]">Descripción</label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={3}
                  className="w-full p-3 rounded-lg bg-[rgba(255,255,255,0.05)]
                  border border-[rgba(200,169,126,0.35)]
                  text-[var(--color-text-light)]"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-muted)]">Precio (opcional)</label>
                <Input
                  value={precio}
                  onChange={(e: any) => setPrecio(e.target.value)}
                  placeholder="Ej: 12500"
                />
              </div>
            </>
          )}

          <div className="flex gap-3">
            <Button onClick={guardar}>{editId ? "Guardar cambios" : "Agregar bloque"}</Button>

            {editId && (
              <Button
                className="bg-transparent border border-[var(--color-gold)]"
                onClick={limpiarForm}
              >
                Cancelar
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-playfair text-xl mb-4 text-[var(--color-gold-light)]">Bloques actuales</h2>

        {loading ? (
          <p className="text-[var(--color-text-muted)]">Cargando…</p>
        ) : blocksOrdenados.length === 0 ? (
          <p className="text-[var(--color-text-muted)]">Todavía no hay bloques creados.</p>
        ) : (
          <div className="space-y-3">
            {blocksOrdenados.map((b) => (
              <div
                key={b.id}
                className="flex justify-between items-start gap-3 border-b border-white/10 pb-2"
              >
                <div className="min-w-0">
                  <p className="font-semibold truncate">
                    {b.titulo}{" "}
                    {!b.activo && <span className="text-xs text-red-400">(oculto)</span>}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Tipo: {b.tipo} · Orden: {b.orden ?? "—"}
                    {(b as any).imagenURL ? " · Imagen: sí" : " · Imagen: no"}
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button onClick={() => mover(b, "up")}>↑</Button>
                  <Button onClick={() => mover(b, "down")}>↓</Button>
                  <Button onClick={() => toggleActivo(b)}>{b.activo ? "Ocultar" : "Mostrar"}</Button>
                  <Button onClick={() => editar(b)}>Editar</Button>
                  <Button className="bg-red-700 hover:bg-red-800" onClick={() => eliminar(b.id)}>
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
