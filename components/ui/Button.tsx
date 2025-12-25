"use client";

import React from "react";
import clsx from "clsx";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
};

export default function Button({
  children,
  className,
  variant = "primary",
  ...props
}: Props) {
  const base =
    "px-5 py-2.5 rounded-lg font-medium tracking-wide transition-all duration-200 focus:outline-none focus:ring-2 active:scale-[0.97] shadow-[0_4px_12px_rgba(0,0,0,0.35)] hover:shadow-[0_6px_18px_rgba(0,0,0,0.45)]";

  const variants = {
    primary:
      "bg-[var(--color-gold)] text-black hover:bg-[var(--color-gold-light)] focus:ring-[var(--color-gold-light)]",
    secondary:
      "bg-[rgba(255,255,255,0.08)] text-[var(--color-text-light)] border border-[rgba(200,169,126,0.35)] hover:bg-[rgba(255,255,255,0.12)] focus:ring-[var(--color-gold)]",
    danger:
      "bg-red-700 text-white hover:bg-red-800 focus:ring-red-400",
  };

  return (
    <button
      {...props}
      className={clsx(base, variants[variant], className)}
    >
      {children}
    </button>
  );
}
