import { Suspense } from "react";
import MenuClient from "./MenuClient";

export const dynamic = "force-dynamic";

export default function MenuPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center text-white/70">
          Cargando menú…
        </div>
      }
    >
      <MenuClient />
    </Suspense>
  );
}
