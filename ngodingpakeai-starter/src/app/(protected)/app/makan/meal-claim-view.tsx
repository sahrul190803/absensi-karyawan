"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Moon, Sunrise, Sun, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "cn";
import { formatDate } from "@/lib/format";

type Claim = {
  id: string;
  date: string;
  session: string;
  note: string;
  claimedAt: string;
};

type MealsData = {
  today: string;
  todayClaim: Claim | null;
  history: Claim[];
};

const SESSIONS = [
  { value: "pagi", label: "Pagi", hint: "Sebelum 11.00", icon: Sunrise },
  { value: "siang", label: "Siang", hint: "11.00 – 17.00", icon: Sun },
  { value: "malam", label: "Malam", hint: "Setelah 17.00", icon: Moon },
];

const sessionLabel = (value: string) =>
  SESSIONS.find((session) => session.value === value)?.label ?? value;

export function MealClaimView() {
  const [data, setData] = useState<MealsData | null>(null);
  const [session, setSession] = useState("siang");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/meals", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Gagal memuat klaim makan.");
        return;
      }
      setData(body.data);
      setError(null);
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const claim = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session, note }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(
          body?.error?.details?.[0]?.message ??
            body?.error?.message ??
            "Gagal menyimpan klaim makan.",
        );
        return;
      }
      setNotice("Klaim makan hari ini tercatat.");
      setNote("");
      await load();
    } catch {
      setError("Jaringan bermasalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Jadwal Makan
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Satu klaim per hari. Pilih sesi makan Anda: pagi, siang, atau malam.
        </p>
      </div>

      {notice && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm"
        >
          <CheckCircle2 className="size-4 text-positive" aria-hidden="true" />
          {notice}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <section className="rounded-lg border border-border-strong bg-card p-5">
        {loading ? (
          <p className="text-sm text-muted-foreground">Memuat…</p>
        ) : data?.todayClaim ? (
          <div className="flex items-start gap-4">
            <span className="grid size-11 flex-none place-items-center rounded-lg border border-border-strong bg-primary-quiet">
              <UtensilsCrossed
                className="size-5 text-primary-text"
                aria-hidden="true"
              />
            </span>
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Klaim hari ini
              </p>
              <p className="mt-1 text-lg font-semibold">
                Makan {sessionLabel(data.todayClaim.session)}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {formatDate(data.todayClaim.date)}
                {data.todayClaim.note ? ` · ${data.todayClaim.note}` : ""}
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Klaim hari ini
            </p>
            <p className="mt-1 text-lg font-semibold">
              Belum ada klaim hari ini
            </p>

            <fieldset className="mt-4">
              <legend className="text-sm font-medium">Sesi makan</legend>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {SESSIONS.map((option) => {
                  const active = session === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSession(option.value)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg border px-3 py-3 text-sm",
                        active
                          ? "border-border-strong bg-primary-quiet font-semibold"
                          : "border-border bg-card text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <option.icon className="size-4" aria-hidden="true" />
                      {option.label}
                      <span className="text-[10px] font-normal text-muted-foreground">
                        {option.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <label className="mt-4 grid gap-1.5 text-sm">
              <span className="font-medium">Catatan (opsional)</span>
              <input
                type="text"
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Contoh: nasi ayam tanpa sambal"
              />
            </label>

            <Button
              className="mt-4 w-full sm:w-auto"
              disabled={busy}
              onClick={() => void claim()}
            >
              <UtensilsCrossed aria-hidden="true" />
              {busy
                ? "Menyimpan…"
                : `Klaim makan ${sessionLabel(session).toLowerCase()}`}
            </Button>
          </>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Riwayat klaim
        </h2>
        {data && data.history.length > 0 ? (
          <ul className="mt-3 divide-y divide-border rounded-lg border bg-card">
            {data.history.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    Makan {sessionLabel(row.session)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(row.date, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {row.note ? ` · ${row.note}` : ""}
                  </p>
                </div>
                <span className="rounded-full border border-border-strong bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {sessionLabel(row.session)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Belum ada riwayat klaim.
          </p>
        )}
      </section>

      <Button variant="ghost" asChild>
        <Link href="/app">Kembali ke beranda</Link>
      </Button>
    </div>
  );
}
