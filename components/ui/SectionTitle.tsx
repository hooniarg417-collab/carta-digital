export default function SectionTitle({ children }: { children: string }) {
  return (
    <h2
      className="
        text-2xl sm:text-3xl md:text-4xl
        font-playfair font-semibold
        text-center
        text-[var(--color-gold)]
        tracking-[0.06em]
        mb-4 sm:mb-6
      "
    >
      {children}
    </h2>
  );
}
