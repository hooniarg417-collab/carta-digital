export default function Footer() {
  return (
    <footer className="mt-4 pt-4 border-t border-[rgba(200,169,126,0.25)] text-xs text-[var(--color-text-muted)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
      <p>
        © {new Date().getFullYear()} Maitreya by Patagonia Gourmet. Todos los
        derechos reservados.
      </p>
      <p className="opacity-80">
        Sección chacras, Fernández Oro · Patagonia.
      </p>
    </footer>
  );
}
