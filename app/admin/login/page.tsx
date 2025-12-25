"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function AdminLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect"); // ej: /mozo/mesas, /cocina, etc.

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Completá email y contraseña.");
      return;
    }

    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);

      // Si vino un redirect por querystring, lo respetamos.
      // Si no, vamos al dashboard admin.
      if (redirect) {
        router.push(redirect);
      } else {
        router.push("/admin/dashboard");
      }
    } catch (err: any) {
      console.error(err);
      setError("Credenciales incorrectas o usuario no autorizado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-6">
      <div className="w-full max-w-md glass-panel rounded-2xl p-8">
        <h1 className="text-center text-3xl font-playfair text-[var(--color-gold)] mb-2">
          Panel Administrativo
        </h1>
        <p className="text-center text-xs text-[var(--color-text-muted)] mb-6">
          Acceso exclusivo para el equipo de Maitreya.
        </p>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="text-white/70 text-sm">Email</label>
            <Input
              type="email"
              placeholder="admin@maitreya.com"
              value={email}
              onChange={(e: any) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="text-white/70 text-sm">Contraseña</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e: any) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <Button type="submit" className="w-full mt-4" disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
