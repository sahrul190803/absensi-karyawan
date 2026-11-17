import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  LoaderCircle,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api";
import type {
  MealClaimsResponse,
  UnclaimedMealResponse,
} from "@/lib/admin-types";
import { useAuth } from "@/lib/auth";
import { formatDate, todayIso } from "@/lib/format";

const SESSION_LABELS: Record<string, string> = {
  pagi: "Pagi",
  siang: "Siang",
  malam: "Malam",
};

export function AdminMealsScreen() {
  const { roles } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"claims" | "unclaimed">("claims");
  const [from, setFrom] = useState(() => todayIso());
  const [to, setTo] = useState(() => todayIso());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canDelete = roles.some((role) => ["hrd", "admin"].includes(role));
  const range = `from=${from}&to=${to}`;

  const claimsQuery = useQuery({
    queryKey: ["admin", "meals", from, to],
    queryFn: () =>
      apiFetch<MealClaimsResponse>(`/api/admin/meals?${range}&limit=100&offset=0`),
    retry: false,
    enabled: tab === "claims",
  });

  const unclaimedQuery = useQuery({
    queryKey: ["admin", "meals", "unclaimed", from, to],
    queryFn: () =>
      apiFetch<UnclaimedMealResponse>(
        `/api/admin/meals/unclaimed?${range}&limit=100&offset=0`,
      ),
    retry: false,
    enabled: tab === "unclaimed",
  });

  const totals =
    tab === "claims"
      ? claimsQuery.data?.meta.totals
      : unclaimedQuery.data?.meta.totals;

  async function removeClaim(id: string) {
    if (!window.confirm("Hapus klaim makan ini? Tindakan ini dicatat di audit."))
      return;
    setBusyId(id);
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/admin/meals/${id}`, { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: ["admin", "meals"] });
      setNotice("Klaim makan dihapus.");
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : "Gagal menghapus klaim.",
      );
    } finally {
      setBusyId(null);
    }
  }

  const loading = tab === "claims" ? claimsQuery.isLoading : unclaimedQuery.isLoading;
  const queryError =
    tab === "claims" ? claimsQuery.error : unclaimedQuery.error;
  const claims = claimsQuery.data?.data ?? [];
  const unclaimed = unclaimedQuery.data?.data ?? [];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Klaim Makan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pantau klaim per sesi dan cek karyawan yang belum mengklaim.
        </p>
      </header>

      {notice && (
        <p
          role="status"
          className="rounded-lg border bg-card px-4 py-3 text-sm text-positive"
        >
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

      <div className="grid gap-2">
        <label className="flex items-center gap-2 rounded-lg border bg-card p-3 text-sm">
          <CalendarDays
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="font-medium">Dari</span>
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="ml-auto h-10 min-w-0 rounded-md border border-border bg-transparent px-2 text-base"
          />
        </label>
        <label className="flex items-center gap-2 rounded-lg border bg-card p-3 text-sm">
          <CalendarDays
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="font-medium">Sampai</span>
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="ml-auto h-10 min-w-0 rounded-md border border-border bg-transparent px-2 text-base"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-lg border bg-card p-1.5">
        <button
          type="button"
          onClick={() => setTab("claims")}
          className={`min-h-10 rounded-md px-3 text-sm font-medium ${
            tab === "claims"
              ? "bg-primary-quiet text-foreground"
              : "text-muted-foreground"
          }`}
        >
          Sudah klaim
        </button>
        <button
          type="button"
          onClick={() => setTab("unclaimed")}
          className={`min-h-10 rounded-md px-3 text-sm font-medium ${
            tab === "unclaimed"
              ? "bg-primary-quiet text-foreground"
              : "text-muted-foreground"
          }`}
        >
          Belum klaim
        </button>
      </div>

      {totals && (
        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-lg border bg-card p-3">
            <p className="text-[11px] text-muted-foreground uppercase">Total</p>
            <p className="mt-1 text-xl font-semibold">{totals.total}</p>
          </div>
          {(["pagi", "siang", "malam"] as const).map((session) => (
            <div key={session} className="rounded-lg border bg-card p-3">
              <p className="text-[11px] text-muted-foreground uppercase">
                {SESSION_LABELS[session]}
              </p>
              <p className="mt-1 text-xl font-semibold">{totals[session]}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Memuat data makan…
        </p>
      ) : queryError ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger"
        >
          {queryError.message}
        </p>
      ) : tab === "claims" ? (
        claims.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-card px-6 py-12 text-center">
            <UtensilsCrossed
              className="mx-auto size-6 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm text-muted-foreground">
              Belum ada klaim makan pada rentang ini.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {claims.map((row) => (
              <li key={row.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{row.employeeName}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.employeeNik}
                      {row.departmentName ? ` · ${row.departmentName}` : ""}
                    </p>
                  </div>
                  <span className="rounded-full border border-border-strong bg-primary-quiet px-2.5 py-0.5 text-xs font-semibold">
                    {SESSION_LABELS[row.session] ?? row.session}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="font-mono text-xs text-muted-foreground">
                    {formatDate(row.date)}
                  </p>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busyId === row.id}
                      onClick={() => void removeClaim(row.id)}
                    >
                      {busyId === row.id ? (
                        <LoaderCircle className="animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 aria-hidden="true" />
                      )}
                      Hapus
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )
      ) : unclaimed.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card px-6 py-12 text-center">
          <UtensilsCrossed
            className="mx-auto size-6 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm text-muted-foreground">
            Semua karyawan yang hadir sudah mengklaim makan.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {unclaimed.map((row) => (
            <li
              key={`${row.employeeId}-${row.date}`}
              className="rounded-lg border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{row.employeeName}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.employeeNik}
                    {row.departmentName ? ` · ${row.departmentName}` : ""}
                  </p>
                </div>
                <span className="rounded-full border border-border-strong bg-muted px-2.5 py-0.5 text-xs font-semibold">
                  {SESSION_LABELS[row.session] ?? row.session}
                </span>
              </div>
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                {formatDate(row.date)}
                {row.shiftName ? ` · ${row.shiftName}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
