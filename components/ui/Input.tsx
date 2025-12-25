import React from "react";
import clsx from "clsx";

export default function Input({ className, ...props }: any) {
  return (
    <input
      {...props}
      className={clsx(
        `
        w-full p-3 rounded-lg text-[var(--color-text-light)]
        bg-[rgba(255,255,255,0.05)]
        border border-[rgba(200,169,126,0.35)]
        placeholder-[var(--color-text-muted)]
        focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]
        backdrop-blur-sm
        transition-all
      `,
        className
      )}
    />
  );
}
