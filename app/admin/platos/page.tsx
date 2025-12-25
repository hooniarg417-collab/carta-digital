"use client";

import { useEffect, useState } from "react";
import {
  Plato,
  Categoria,
  getPlatos,
  getCategorias,
  createPlato,
  deletePlato,
  updatePlato,
} from "@/lib/firestore";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function PlatosPage() {
  const [platos, setPlatos] = useState<Plato[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  // Form
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [categoriaId, setCategoriaId] = useState(""); // "" = sin categoría / general
  const [tieneImagen, setTieneImagen] = useState(false);
  const [imagenFile, setImagenFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);

  // Edición
  const [editPlatoId, setEditPlatoId] = useState<string | null>(null);

  const cargar = async () => {
    const [cats, pls] = await Promise.all([getCategorias(), getPlatos()]);
    setCategorias(cats);
    setPlatos(pls);
  };

  useEffect(() => {
    cargar();
  }, []);

  const limpiarForm = () => {
    setNombre("");
    setDescripcion("");
    setPrecio("");
    setCategoriaId("");
    setTieneImagen(false);
    setImagenFile(null);
    setEditPlatoId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !descripcion.trim() || !precio.trim()) return;

    const precioNum = Number(precio.replace(",", "."));
    if (isNaN(precioNum) || precioNum <= 0) {
      alert("El precio debe ser un número mayor a 0.");
      return;
    }

    setLoading(true);

    try {
      let imagenURL: string | null = null;

      if (tieneImagen && imagenFile) {
        const uniqueName = `${Date.now()}-${imagenFile.name}`;
        const storageRef = ref(storage, `platos/${uniqueName}`);
        await uploadBytes(storageRef, imagenFile);
        imagenURL = await getDownloadURL(storageRef);
      }

      const catId = categoriaId || "";

      if (editPlatoId) {
        await updatePlato(editPlatoId, {
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          precio: precioNum,
          categoriaId: catId,
          // si no subiste imagen nueva, no pisamos imagenURL existente
          ...(imagenURL ? { imagenURL } : {}),
          // si tildaste, queda true; si destildaste, lo apaga
          tieneImagen: tieneImagen || !!imagenURL,
        });
      } else {
        const mismosCat = platos.filter((p) => (p.categoriaId || "") === catId);
        const maxOrden = mismosCat.reduce((max, p) => Math.max(max, p.orden ?? 0), 0);
        const nuevoOrden = maxOrden + 1;

        await createPlato({
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          precio: precioNum,
          categoriaId: catId,
          tieneImagen: !!imagenURL,
          imagenURL,
          activo: true,
          orden: nuevoOrden,
        });
      }

      limpiarForm();
      await cargar();
    } catch (err: any) {
      console.error(err);
      alert(`No se pudo guardar el plato. Mirá la consola.\n${err?.message ?? ""}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este plato?")) return;
    await deletePlato(id);
    await cargar();
  };

  const toggleActivo = async (plato: Plato) => {
    await updatePlato(plato.id, { activo: !plato.activo });
    await cargar();
  };

  const getCategoriaNombre = (id: string) =>
    categorias.find((c) => c.id === id)?.nombre || (id ? "Categoría desconocida" : "General");

  const startEdit = (plato: Plato) => {
    setEditPlatoId(plato.id);
    setNombre(plato.nombre);
    setDescripcion(plato.descripcion);
    setPrecio(String(plato.precio));
    setCategoriaId(plato.categoriaId || "");
    setTieneImagen(!!plato.tieneImagen);
    setImagenFile(null);
  };

  const movePlato = async (plato: Plato, dir: "up" | "down") => {
    const catId = plato.categoriaId || "";
    const mismosCat = platos
      .filter((p) => (p.categoriaId || "") === catId)
      .sort((a, b) => (a.orden ?? 9999) - (b.orden ?? 9999));

    const idx = mismosCat.findIndex((p) => p.id === plato.id);
    if (idx === -1) return;

    const targetIdx = dir === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= mismosCat.length) return;

    const other = mismosCat[targetIdx];

    await Promise.all([
      updatePlato(plato.id, { orden: other.orden }),
      updatePlato(other.id, { orden: plato.orden }),
    ]);

    await cargar();
  };

  // cambio de categoría inline + reorden básico
  const cambiarCategoriaInline = async (plato: Plato, nuevaCategoriaId: string) => {
    const oldCat = plato.categoriaId || "";
    const newCat = nuevaCategoriaId || "";

    if (oldCat === newCat) return;

    // lo ponemos al final de la nueva categoría
    const enNueva = platos.filter((p) => (p.categoriaId || "") === newCat);
    const maxOrden = enNueva.reduce((max, p) => Math.max(max, p.orden ?? 0), 0);
    const nuevoOrden = maxOrden + 1;

    await updatePlato(plato.id, { categoriaId: newCat, orden: nuevoOrden });
    await cargar();
  };

  const platosOrdenados = [...platos].sort((a, b) => {
    const catA = a.categoriaId || "";
    const catB = b.categoriaId || "";
    if (catA === catB) return (a.orden ?? 9999) - (b.orden ?? 9999);
    return catA.localeCompare(catB);
  });

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-playfair text-[var(--color-gold)]">Platos</h1>

      <Card>
        <h2 className="font-playfair text-xl mb-4 text-[var(--color-gold-light)]">
          {editPlatoId ? "Editar plato" : "Crear nuevo plato"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">Nombre</label>
            <Input value={nombre} onChange={(e: any) => setNombre(e.target.value)} placeholder="Ej: Ojo de Bife..." />
          </div>

          <div>
            <label className="text-xs text-[var(--color-text-muted)]">Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="
                w-full p-3 rounded-lg bg-[rgba(255,255,255,0.05)]
                border border-[rgba(200,169,126,0.35)]
                text-[var(--color-text-light)]
                placeholder-[var(--color-text-muted)]
                focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]
                backdrop-blur-sm
              "
              rows={3}
              placeholder="Descripción del plato..."
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-xs text-[var(--color-text-muted)]">Precio</label>
              <Input value={precio} onChange={(e: any) => setPrecio(e.target.value)} placeholder="Ej: 14900" />
            </div>

            <div className="flex-1">
              <label className="text-xs text-[var(--color-text-muted)]">Categoría</label>
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="
                  w-full p-3 rounded-lg bg-[rgba(255,255,255,0.05)]
                  border border-[rgba(200,169,126,0.35)]
                  text-[var(--color-text-light)]
                  focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]
                "
              >
                <option value="">Sin categoría / General (orden global)</option>
                {categorias
                  .slice()
                  .sort((a, b) => a.orden - b.orden)
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                id="tieneImagen"
                type="checkbox"
                checked={tieneImagen}
                onChange={(e) => setTieneImagen(e.target.checked)}
              />
              Este plato tiene imagen
            </label>

            {tieneImagen && (
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImagenFile(e.target.files?.[0] || null)}
                className="text-xs text-[var(--color-text-muted)]"
              />
            )}
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : editPlatoId ? "Guardar cambios" : "Guardar plato"}
            </Button>

            {editPlatoId && (
              <Button
                type="button"
                className="bg-transparent border border-[var(--color-gold)] text-[var(--color-gold-light)] hover:bg-[rgba(200,169,126,0.15)]"
                onClick={limpiarForm}
              >
                Cancelar edición
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="font-playfair text-xl mb-4 text-[var(--color-gold-light)]">Lista de platos</h2>

        {platosOrdenados.length === 0 ? (
          <p className="text-[var(--color-text-muted)]">Aún no hay platos cargados.</p>
        ) : (
          <div className="space-y-3">
            {platosOrdenados.map((plato) => (
              <div
                key={plato.id}
                className="flex items-start justify-between gap-3 border-b border-[rgba(255,255,255,0.06)] pb-2"
              >
                <div className="min-w-0">
                  <p className="font-playfair text-lg text-[var(--color-gold)]">
                    {plato.nombre}
                    {!plato.activo && (
                      <span className="ml-2 text-xs text-[var(--color-text-muted)]">(oculto)</span>
                    )}
                  </p>

                  <p className="text-sm text-[var(--color-text-muted)]">
                    <span className="text-[var(--color-gold-light)]">Sección:</span>{" "}
                    {getCategoriaNombre(plato.categoriaId)} · $
                    {plato.precio.toLocaleString("es-AR")}
                  </p>

                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    Orden: {plato.orden ?? "—"} · Imagen: {plato.tieneImagen ? "Sí" : "No"}
                  </p>

                  {/* Selector inline para cambiar de sección */}
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[0.7rem] text-[var(--color-text-muted)]">Mover a:</span>
                    <select
                      value={plato.categoriaId || ""}
                      onChange={(e) => cambiarCategoriaInline(plato, e.target.value)}
                      className="
                        px-2 py-1 rounded-lg bg-[rgba(255,255,255,0.05)]
                        border border-[rgba(200,169,126,0.35)]
                        text-[var(--color-text-light)]
                        text-xs
                        focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]
                      "
                    >
                      <option value="">General</option>
                      {categorias
                        .slice()
                        .sort((a, b) => a.orden - b.orden)
                        .map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.nombre}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap justify-end">
                  <Button
                    type="button"
                    className="text-xs px-3 py-1.5 bg-transparent border border-[var(--color-gold)] text-[var(--color-gold-light)] hover:bg-[rgba(200,169,126,0.15)]"
                    onClick={() => movePlato(plato, "up")}
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    className="text-xs px-3 py-1.5 bg-transparent border border-[var(--color-gold)] text-[var(--color-gold-light)] hover:bg-[rgba(200,169,126,0.15)]"
                    onClick={() => movePlato(plato, "down")}
                  >
                    ↓
                  </Button>
                  <Button
                    type="button"
                    className="text-xs px-3 py-1.5 bg-transparent border border-[var(--color-gold)] text-[var(--color-gold-light)] hover:bg-[rgba(200,169,126,0.15)]"
                    onClick={() => toggleActivo(plato)}
                  >
                    {plato.activo ? "Ocultar" : "Mostrar"}
                  </Button>
                  <Button
                    type="button"
                    className="text-xs px-3 py-1.5 bg-transparent border border-[var(--color-gold)] text-[var(--color-gold-light)] hover:bg-[rgba(200,169,126,0.15)]"
                    onClick={() => startEdit(plato)}
                  >
                    Editar
                  </Button>
                  <Button
                    type="button"
                    className="text-xs px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white"
                    onClick={() => handleDelete(plato.id)}
                  >
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
