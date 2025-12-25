import type { ReactNode } from "react";

export default function CocinaLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen w-full"
      style={{
        background:
          "radial-gradient(circle at 20% 10%, rgba(255,255,255,0.06), transparent 55%)," +
          "linear-gradient(135deg, #0b0b0b, #050505)",
      }}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">{children}</div>
    </div>
  );
}
