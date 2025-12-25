"use client";

import { useEffect, useState } from "react";
import {
  Categoria,
  getCategorias,
  createCategoria,
  updateCategoria,
  deleteCategoria,
} from "@/lib/firestore";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [nuevaNombre, setNuevaNombre] = useState("");
  const [loadingLista, setLoadingLista] = useState(true);
  const [loadingCrear, setLoadingCrear] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = async () => {
    try {
      setError(null);
      setLoadingLista(true);
      const data = await getCategorias();
      setCategorias(data);
    } catch (e) {
      console.error("Error cargando categorías:", e);
      setError("No se pudieron cargar las categorías.");
    } finally {
      setLoadingLista(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaNombre.trim()) return;

    try {
      setLoadingCrear(true);
      await createCategoria(nuevaNombre.trim());
      setNuevaNombre("");
      await cargar();
    } catch (e) {
      console.error("Error creando categoría:", e);
      alert(
        "No se pudo guardar la categoría. Revisá la consola del navegador para más detalles."
      );
    } finally {
      setLoadingCrear(false);
    }
  };

  const toggleActiva = async (cat: Categoria) => {
    try {
      await updateCategoria(cat.id, { activa: !cat.activa });
      await cargar();
    } catch (e) {
      console.error("Error actualizando categoría:", e);
      alert("No se pudo actualizar la categoría.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta categoría?")) return;
    try {
      await deleteCategoria(id);
      await cargar();
    } catch (e) {
      console.error("Error eliminando categoría:", e);
      alert("No se pudo eliminar la categoría.");
    }
  };

  // Editar nombre con prompt (rápido y funcional)
  const renameCategoria = async (cat: Categoria) => {
    const nuevo = prompt("Nuevo nombre de la categoría:", cat.nombre);
    if (!nuevo) return;
    const nombreTrim = nuevo.trim();
    if (!nombreTrim || nombreTrim === cat.nombre) return;

    try {
      await updateCategoria(cat.id, { nombre: nombreTrim });
      await cargar();
    } catch (e) {
      console.error("Error renombrando categoría:", e);
      alert("No se pudo renombrar la categoría.");
    }
  };

  const moveCategoria = async (cat: Categoria, dir: "up" | "down") => {
    const ordenado = [...categorias].sort((a, b) => a.orden - b.orden);
    const idx = ordenado.findIndex((c) => c.id === cat.id);
    if (idx === -1) return;

    const targetIdx = dir === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= ordenado.length) return;

    const other = ordenado[targetIdx];

    try {
      await Promise.all([
        updateCategoria(cat.id, { orden: other.orden }),
        updateCategoria(other.id, { orden: cat.orden }),
      ]);
      await cargar();
    } catch (e) {
      console.error("Error reordenando categorías:", e);
      alert("No se pudo cambiar el orden.");
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-playfair text-[var(--color-gold)]">
        Categorías del menú
      </h1>

      {/* Formulario nueva categoría */}
      <Card>
        <form
          onSubmit={handleCrear}
          className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end"
        >
          <div className="flex-1">
            <label className="text-xs text-[var(--color-text-muted)]">
              Nombre de nueva categoría
            </label>
            <Input
              value={nuevaNombre}
              onChange={(e: any) => setNuevaNombre(e.target.value)}
              placeholder="Ej: Entradas, Principales, Postres…"
            />
          </div>
          <Button
            type="submit"
            className="sm:w-40"
            disabled={loadingCrear || !nuevaNombre.trim()}
          >
            {loadingCrear ? "Guardando..." : "Agregar"}
          </Button>
        </form>
      </Card>

      {/* Lista de categorías */}
      <Card>
        <h2 className="font-playfair text-xl mb-4 text-[var(--color-gold-light)]">
          Lista de categorías
        </h2>

        {loadingLista ? (
          <p className="text-[var(--color-text-muted)] text-sm">
            Cargando categorías...
          </p>
        ) : error ? (
          <p className="text-red-400 text-sm">{error}</p>
        ) : categorias.length === 0 ? (
          <p className="text-[var(--color-text-muted)]">
            Todavía no hay categorías cargadas.
          </p>
        ) : (
          <ul className="space-y-3">
            {categorias
              .slice()
              .sort((a, b) => a.orden - b.orden)
              .map((cat) => (
                <li
                  key={cat.id}
                  className="flex items-center justify-between gap-3 border-b border-[rgba(255,255,255,0.06)] pb-2"
                >
                  <div>
                    <p className="font-medium">{cat.nombre}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Orden: {cat.orden} · {cat.activa ? "Activa" : "Oculta"}
                    </p>
                  </div>

                  <div className="flex gap-2 flex-wrap justify-end">
                    <Button
                      type="button"
                      className="text-xs px-3 py-1.5 bg-transparent border border-[var(--color-gold)] text-[var(--color-gold-light)] hover:bg-[rgba(200,169,126,0.15)]"
                      onClick={() => moveCategoria(cat, "up")}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      className="text-xs px-3 py-1.5 bg-transparent border border-[var(--color-gold)] text-[var(--color-gold-light)] hover:bg-[rgba(200,169,126,0.15)]"
                      onClick={() => moveCategoria(cat, "down")}
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      className="text-xs px-3 py-1.5 bg-transparent border border-[var(--color-gold)] text-[var(--color-gold-light)] hover:bg-[rgba(200,169,126,0.15)]"
                      onClick={() => toggleActiva(cat)}
                    >
                      {cat.activa ? "Ocultar" : "Mostrar"}
                    </Button>
                    <Button
                      type="button"
                      className="text-xs px-3 py-1.5 bg-transparent border border-[var(--color-gold)] text-[var(--color-gold-light)] hover:bg-[rgba(200,169,126,0.15)]"
                      onClick={() => renameCategoria(cat)}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      className="text-xs px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white"
                      onClick={() => handleDelete(cat.id)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
