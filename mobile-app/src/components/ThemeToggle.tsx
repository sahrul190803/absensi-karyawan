import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Moon, Sun } from "lucide-react";
import { cn } from "cn";

const STORAGE_KEY = "hadirku-theme";

function currentIsDark() {
  return document.documentElement.classList.contains("dark");
}

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(currentIsDark);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    window.localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");

    if (Capacitor.isNativePlatform()) {
      void StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
      if (Capacitor.getPlatform() === "android") {
        void StatusBar.setBackgroundColor({
          color: dark ? "#141410" : "#f7f7f2",
        }).catch(() => undefined);
      }
    }
  }, [dark]);

  return (
    <button
      type="button"
      onClick={() => setDark((value) => !value)}
      className={cn(
        "grid size-10 place-items-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
      aria-label={dark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
      title={dark ? "Mode terang" : "Mode gelap"}
    >
      {dark ? (
        <Sun className="size-4" aria-hidden="true" />
      ) : (
        <Moon className="size-4" aria-hidden="true" />
      )}
    </button>
  );
}
