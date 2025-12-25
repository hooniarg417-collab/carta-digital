"use client";

import { useEffect, useState } from "react";
import {
  Plato,
  getPlatos,
  getPlatoDelDia,
  setPlatoDelDia,
  PlatoDelDiaConfig,
} from "@/lib/firestore";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function PlatoDelDiaPage() {
  const [platos, setPlatos] = useState<Plato[]>([]);
  const [cfg, setCfg] = useState<PlatoDelDiaConfig | null>(null);
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    const [pls, conf] = await Promise.all([getPlatos(), getPlatoDelDia()]);
    setPlatos(pls);
    setCfg(
      conf || {
        modo: "manual",
        activo: false,
      }
    );
  };

  useEffect(() => {
    cargar();
  }, []);

  const guardar = async () => {
    if (!cfg) return;
    setLoading(true);
    await setPlatoDelDia(cfg);
    setLoading(false);
    alert("Configuración guardada.");
  };

  if (!cfg) {
    return <p className="text-[var(--color-text-muted)]">Cargando…</p>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-playfair text-[var(--color-gold)]">
        Plato del día
      </h1>

      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              id="activo"
              type="checkbox"
              checked={cfg.activo}
              onChange={(e) => setCfg({ ...cfg, activo: e.target.checked })}
            />
            <label htmlFor="activo" className="text-sm">
              Mostrar sección "Plato del día" en la carta
            </label>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="modo"
                checked={cfg.modo === "automatico"}
                onChange={() => setCfg({ ...cfg, modo: "automatico" })}
              />
              Usar un plato existente
            </label>

            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="modo"
                checked={cfg.modo === "manual"}
                onChange={() => setCfg({ ...cfg, modo: "manual" })}
              />
              Definir manualmente
            </label>
          </div>

          {cfg.modo === "automatico" ? (
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">
                Elegir plato
              </label>
              <select
                value={cfg.platoId || ""}
                onChange={(e) =>
                  setCfg({
                    ...cfg,
                    platoId: e.target.value || undefined,
                  })
                }
                className="
                  w-full p-3 rounded-lg bg-[rgba(255,255,255,0.05)]
                  border border-[rgba(200,169,126,0.35)]
                  text-[var(--color-text-light)]
                  focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]
                "
              >
                <option value="">Seleccionar…</option>
                {platos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} — ${p.precio.toLocaleString("es-AR")}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[var(--color-text-muted)]">
                  Título
                </label>
                <Input
                  value={cfg.tituloManual || ""}
                  onChange={(e: any) =>
                    setCfg({ ...cfg, tituloManual: e.target.value })
                  }
                  placeholder="Ej: Recomendado del Chef"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-muted)]">
                  Descripción
                </label>
                <textarea
                  value={cfg.descripcionManual || ""}
                  onChange={(e) =>
                    setCfg({ ...cfg, descripcionManual: e.target.value })
                  }
                  className="
                    w-full p-3 rounded-lg bg-[rgba(255,255,255,0.05)]
                    border border-[rgba(200,169,126,0.35)]
                    text-[var(--color-text-light)]
                    placeholder-[var(--color-text-muted)]
                    focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]
                    backdrop-blur-sm
                  "
                  rows={3}
                  placeholder="Descripción del plato del día..."
                />
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-muted)]">
                  Precio
                </label>
                <Input
                  value={cfg.precioManual ?? ""}
                  onChange={(e: any) =>
                    setCfg({
                      ...cfg,
                      precioManual: Number(e.target.value || 0),
                    })
                  }
                  placeholder="Ej: 12500"
                />
              </div>

              {/* Más adelante agregamos imagen subida */}
            </div>
          )}

          <Button onClick={guardar} disabled={loading}>
            {loading ? "Guardando..." : "Guardar configuración"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
