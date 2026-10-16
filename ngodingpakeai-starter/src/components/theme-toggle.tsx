"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "cn";

// Tombol ganti tema terang/gelap. Ikon dikendalikan kelas `dark` pada
// elemen <html> supaya tidak ada mismatch saat hidrasi; status awal
// dipasang oleh skrip kecil di root layout.
export function ThemeToggle({ className }: { className?: string }) {
  const toggle = () => {
    const rootElement = document.documentElement;
    const next = !rootElement.classList.contains("dark");
    rootElement.classList.toggle("dark", next);
    try {
      window.localStorage.setItem("hadirku-theme", next ? "dark" : "light");
    } catch {
      // abaikan bila penyimpanan lokal tidak tersedia
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Ganti tema terang/gelap"
      title="Ganti tema terang/gelap"
      className={cn(
        "grid size-9 flex-none place-items-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
    >
      <Moon className="size-4 dark:hidden" aria-hidden="true" />
      <Sun className="hidden size-4 dark:block" aria-hidden="true" />
    </button>
  );
}
