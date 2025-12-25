import { Suspense } from "react";
import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center text-white/70">Cargando…</div>}>
      <LoginClient />
    </Suspense>
  );
}
