import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";

type MealClaim = {
  id: string;
  date: string;
  session: string;
  note: string | null;
};

type MealsResponse = {
  data: {
    today: string;
    todayClaim: MealClaim | null;
    history: MealClaim[];
  };
};

const SESSIONS = [
  { value: "pagi", label: "Pagi" },
  { value: "siang", label: "Siang" },
  { value: "malam", label: "Malam" },
] as const;

const sessionLabel = (value: string) =>
  SESSIONS.find((session) => session.value === value)?.label ?? value;

export function MealsScreen() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mealsQuery = useQuery({
    queryKey: ["meals"],
    queryFn: () => apiFetch<MealsResponse>("/api/meals"),
    retry: false,
  });

  const data = mealsQuery.data?.data;
  const claimed = data?.todayClaim ?? null;

  async function claim(session: "pagi" | "siang" | "malam") {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await apiFetch("/api/meals", {
        method: "POST",
        body: { session, note: "" },
      });
      await queryClient.invalidateQueries({ queryKey: ["meals"] });
      setNotice(`Klaim makan ${sessionLabel(session).toLowerCase()} berhasil.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Klaim makan gagal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Jadwal Makan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Klaim jatah makan pagi, siang, atau malam. Satu klaim per hari.
        </p>
      </header>

      {notice && (
        <p role="status" className="rounded-lg border bg-card px-4 py-3 text-sm text-positive">
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

      {mealsQuery.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Memuat data makan…
        </p>
      ) : mealsQuery.error ? (
        <p role="alert" className="rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger">
          {mealsQuery.error.message}
        </p>
      ) : (
        <>
          <section className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Hari ini
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {claimed
                    ? `Sudah klaim ${sessionLabel(claimed.session).toLowerCase()}`
                    : "Belum ada klaim"}
                </p>
              </div>
              <span className="grid size-11 place-items-center rounded-lg border border-border-strong bg-primary-quiet text-primary-text">
                <UtensilsCrossed className="size-5" aria-hidden="true" />
              </span>
            </div>

            {claimed ? (
              <p className="mt-3 rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                Klaim makan {sessionLabel(claimed.session).toLowerCase()} pada{" "}
                {formatDate(claimed.date)} sudah tercatat.
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {SESSIONS.map((session) => (
                  <Button
                    key={session.value}
                    className="h-11"
                    disabled={busy}
                    onClick={() => void claim(session.value)}
                  >
                    {busy ? "…" : session.label}
                  </Button>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Riwayat klaim
            </h2>
            {data?.history.length ? (
              <ul className="mt-3 space-y-2">
                {data.history.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-sm"
                  >
                    <span>{formatDate(row.date)}</span>
                    <span className="rounded-full border border-border-strong bg-primary-quiet px-2.5 py-0.5 text-xs font-semibold">
                      {sessionLabel(row.session)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 rounded-lg border border-dashed bg-card px-4 py-8 text-center text-sm text-muted-foreground">
                Belum ada riwayat klaim makan.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
