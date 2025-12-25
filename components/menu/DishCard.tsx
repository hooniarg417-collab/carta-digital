"use client";

type Props = {
  name: string;
  description?: string;
  price: number;
  imageUrl?: string | null;
};

function moneyARS(n: number) {
  try {
    return n.toLocaleString("es-AR");
  } catch {
    return String(n);
  }
}

export default function DishCard({ name, description, price, imageUrl }: Props) {
  return (
    <div className="py-4">
      <div className="flex items-start gap-3">
        {imageUrl ? (
          <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 bg-white/5 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold text-[var(--color-text-light)] leading-snug truncate">
              {name}
            </h3>

            <div className="flex-shrink-0 text-right">
              <span className="text-[var(--color-gold-light)] font-semibold tabular-nums">
                ${moneyARS(price)}
              </span>
            </div>
          </div>

          {description ? (
            <p className="text-sm text-[var(--color-text-muted)] mt-1 leading-relaxed">
              {description}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
