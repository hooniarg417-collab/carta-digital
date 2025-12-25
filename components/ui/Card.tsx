import React from "react";

export default function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="
        rounded-2xl p-6
        bg-[rgba(20,18,15,0.6)]
        border border-[rgba(200,169,126,0.25)]
        shadow-[0_8px_24px_rgba(0,0,0,0.45)]
        backdrop-blur-xl
        transition-all duration-300
        hover:border-[rgba(200,169,126,0.45)]
      "
    >
      {children}
    </div>
  );
}
