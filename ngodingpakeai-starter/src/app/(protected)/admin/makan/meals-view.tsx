"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "cn";
import { formatDate } from "@/lib/format";

type Claim = {
  id: string;
  date: string;
  session: string;
  note: string;
  employeeName: string;
  employeeNik: string;
  departmentName: string | null;
};

type Unclaimed = {
  employeeId: string;
  employeeName: string;
  employeeNik: string;
  departmentName: string | null;
  date: string;
  session: string;
  shiftName: string | null;
};

type Totals = { total: number; pagi: number; siang: number; malam: number };

type Position = { id: string; name: string };

type Selection = "total" | "pagi" | "siang" | "malam" | "unclaimed";
type UnclaimedSession = "all" | "pagi" | "siang" | "malam";

const PAGE_SIZE = 100;

const emptyTotals = (): Totals => ({
  total: 0,
  pagi: 0,
  siang: 0,
  malam: 0,
});

const sessionLabels: Record<string, string> = {
  pagi: "Makan pagi",
  siang: "Makan siang",
  malam: "Makan malam",
};

const sessionShortLabels: Record<string, string> = {
  pagi: "Pagi",
  siang: "Siang",
  malam: "Malam",
};

const detailTitles: Record<Selection, string> = {
  total: "Semua klaim",
  pagi: "Klaim makan pagi",
  siang: "Klaim makan siang",
  malam: "Klaim makan malam",
  unclaimed: "Tidak mengklaim",
};

const pad = (value: number) => String(value).padStart(2, "0");

const monthBounds = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();
  return {
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(lastDay)}`,
  };
};

export function MealsAdminView() {
  const initial = monthBounds();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [positionId, setPositionId] = useState("");
  const [positions, setPositions] = useState<Position[]>([]);
  const [totals, setTotals] = useState<Totals>(emptyTotals);
  const [unclaimedTotals, setUnclaimedTotals] = useState<Totals>(emptyTotals);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [unclaimedSession, setUnclaimedSession] =
    useState<UnclaimedSession>("all");
  const [claims, setClaims] = useState<Claim[]>([]);
  const [unclaimedRows, setUnclaimedRows] = useState<Unclaimed[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const buildParams = useCallback(
    (limit: number, offset: number) => {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (positionId) params.set("positionId", positionId);
      return params;
    },
    [from, to, positionId],
  );

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const response = await fetch(`/api/admin/meals?${buildParams(1, 0)}`, {
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Gagal memuat rekap klaim makan.");
        return;
      }
      setTotals(body.meta?.totals ?? emptyTotals());
      setUnclaimedTotals(body.meta?.unclaimed ?? emptyTotals());
      setError(null);
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setSummaryLoading(false);
    }
  }, [buildParams]);

  const loadDetail = useCallback(
    async (
      target: Selection,
      filter: UnclaimedSession,
      offset: number,
      append: boolean,
    ) => {
      setDetailLoading(true);
      if (!append) {
        setClaims([]);
        setUnclaimedRows([]);
        setHasMore(false);
      }
      try {
        const params = buildParams(PAGE_SIZE, offset);
        const isUnclaimed = target === "unclaimed";
        if (isUnclaimed) {
          if (filter !== "all") params.set("session", filter);
        } else if (target !== "total") {
          params.set("session", target);
        }

        const response = await fetch(
          `/api/admin/meals${isUnclaimed ? "/unclaimed" : ""}?${params}`,
          { cache: "no-store" },
        );
        const body = await response.json();
        if (!response.ok) {
          setError(body?.error?.message ?? "Gagal memuat rincian klaim makan.");
          return;
        }

        if (isUnclaimed) {
          const data = (body.data ?? []) as Unclaimed[];
          setUnclaimedRows((current) =>
            append ? [...current, ...data] : data,
          );
          setClaims([]);
        } else {
          const data = (body.data ?? []) as Claim[];
          setClaims((current) => (append ? [...current, ...data] : data));
          setUnclaimedRows([]);
        }
        setHasMore(Boolean(body.meta?.hasMore));
        setError(null);
      } catch {
        setError("Tidak dapat menghubungi server.");
      } finally {
        setDetailLoading(false);
      }
    },
    [buildParams],
  );

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/positions?limit=200", {
          cache: "no-store",
        });
        const body = await response.json();
        if (active && response.ok) setPositions(body.data ?? []);
      } catch {
        // Abaikan: filter jabatan tetap bisa memakai pilihan kosong.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadSummary(), 0);
    return () => window.clearTimeout(timer);
  }, [loadSummary]);

  useEffect(() => {
    if (!selection) return;
    const timer = window.setTimeout(() => {
      void loadDetail(selection, unclaimedSession, 0, false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selection, unclaimedSession, loadDetail]);

  const remove = async (row: Claim) => {
    if (
      !window.confirm(
        `Hapus klaim ${row.employeeName} (${sessionLabels[row.session] ?? row.session}, ${row.date})?`,
      )
    )
      return;
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/meals/${row.id}`, {
        method: "DELETE",
      });
      if (!response.ok && response.status !== 204) {
        const body = await response.json();
        setError(body?.error?.message ?? "Gagal menghapus klaim.");
        return;
      }
      setNotice("Klaim dihapus.");
      await loadSummary();
      if (selection) {
        await loadDetail(selection, unclaimedSession, 0, false);
      }
    } finally {
      setBusy(false);
    }
  };

  const selectCard = (card: Selection) => {
    setSelection(card);
    setUnclaimedSession("all");
  };

  const unclaimedFilters: { key: UnclaimedSession; label: string; count: number }[] = [
    { key: "all", label: "Semua", count: unclaimedTotals.total },
    { key: "pagi", label: "Pagi", count: unclaimedTotals.pagi },
    { key: "siang", label: "Siang", count: unclaimedTotals.siang },
    { key: "malam", label: "Malam", count: unclaimedTotals.malam },
  ];

  const selectedCount =
    selection === null
      ? 0
      : selection === "unclaimed"
        ? unclaimedSession === "all"
          ? unclaimedTotals.total
          : unclaimedTotals[unclaimedSession]
        : selection === "total"
          ? totals.total
          : totals[selection];

  return (
    <div className="mx-auto max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Klaim makan
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rekap pembagian makan karyawan per periode. Klik kartu di bawah untuk
          melihat rinciannya.
        </p>
      </div>

      {notice && (
        <p role="status" className="mt-4 rounded-lg border bg-card px-4 py-3 text-sm">
          {notice}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Dari tanggal</span>
          <input
            type="date"
            className="h-10 rounded-md border border-border bg-card px-3 text-sm"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Sampai tanggal</span>
          <input
            type="date"
            className="h-10 rounded-md border border-border bg-card px-3 text-sm"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Jabatan
          <select
            className="h-10 rounded-md border border-border bg-card px-2 text-sm text-foreground"
            value={positionId}
            onChange={(event) => setPositionId(event.target.value)}
          >
            <option value="">Semua jabatan</option>
            {positions.map((position) => (
              <option key={position.id} value={position.id}>
                {position.name}
              </option>
            ))}
          </select>
        </label>
        <Button variant="outline" onClick={() => void loadSummary()}>
          Muat ulang
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { key: "total" as const, label: "Total klaim", value: totals.total },
          { key: "pagi" as const, label: "Pagi", value: totals.pagi },
          { key: "siang" as const, label: "Siang", value: totals.siang },
          { key: "malam" as const, label: "Malam", value: totals.malam },
          {
            key: "unclaimed" as const,
            label: "Tidak klaim",
            value: unclaimedTotals.total,
          },
        ].map((card) => {
          const active = selection === card.key;
          return (
            <button
              key={card.key}
              type="button"
              aria-pressed={active}
              onClick={() => selectCard(card.key)}
              className={cn(
                "rounded-lg border bg-card p-4 text-left transition-colors hover:border-border-strong",
                active && "border-border-strong bg-primary-quiet",
              )}
            >
              <span className="block text-sm text-muted-foreground">
                {card.label}
              </span>
              <span className="mt-1 block font-mono text-2xl font-medium">
                {summaryLoading ? "—" : card.value}
              </span>
            </button>
          );
        })}
      </div>

      {selection === null ? (
        <div className="mt-6 rounded-lg border border-dashed bg-card px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Klik salah satu kartu di atas untuk melihat siapa saja yang sudah
            atau belum mengklaim makan.
          </p>
        </div>
      ) : (
        <section className="mt-6" aria-live="polite">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-semibold">{detailTitles[selection]}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {selection === "unclaimed"
                  ? `${selectedCount} karyawan hadir tanpa klaim pada periode ini.`
                  : `${selectedCount} klaim pada periode ini.`}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelection(null)}
            >
              Tutup
            </Button>
          </div>

          {selection === "unclaimed" && (
            <div className="mt-3 flex flex-wrap gap-2">
              {unclaimedFilters.map((filter) => {
                const active = unclaimedSession === filter.key;
                return (
                  <button
                    key={filter.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setUnclaimedSession(filter.key)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      active
                        ? "border-border-strong bg-primary-quiet text-primary-text"
                        : "border-border bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {filter.label}
                    <span className="ml-1.5 font-mono">{filter.count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {detailLoading && claims.length === 0 && unclaimedRows.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Memuat…</p>
          ) : selection === "unclaimed" ? (
            unclaimedRows.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed bg-card px-6 py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  Semua karyawan yang hadir sudah mengklaim makan.
                </p>
              </div>
            ) : (
              <>
                <ul className="mt-4 grid gap-2">
                  {unclaimedRows.map((row) => (
                    <li
                      key={`${row.employeeId}-${row.date}`}
                      className="rounded-lg border bg-card p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium">
                            {row.employeeName}
                            <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                              {row.employeeNik}
                            </span>
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {row.departmentName ?? "—"} ·{" "}
                            {formatDate(row.date, {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}{" "}
                            · {sessionLabels[row.session] ?? row.session}
                            {row.shiftName ? ` · ${row.shiftName}` : ""}
                          </p>
                        </div>
                        <span className="rounded-full border border-border-strong bg-primary-quiet px-2.5 py-0.5 text-xs font-medium text-primary-text">
                          {sessionShortLabels[row.session] ?? row.session}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
                {hasMore && (
                  <Button
                    variant="outline"
                    className="mt-3"
                    disabled={detailLoading}
                    onClick={() =>
                      void loadDetail(
                        "unclaimed",
                        unclaimedSession,
                        unclaimedRows.length,
                        true,
                      )
                    }
                  >
                    Muat lebih banyak
                  </Button>
                )}
              </>
            )
          ) : claims.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed bg-card px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Tidak ada klaim pada periode ini.
              </p>
            </div>
          ) : (
            <>
              <ul className="mt-4 grid gap-2">
                {claims.map((row) => (
                  <li key={row.id} className="rounded-lg border bg-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">
                          {row.employeeName}
                          <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                            {row.employeeNik}
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {row.departmentName ?? "—"} ·{" "}
                          {formatDate(row.date, {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}{" "}
                          · {sessionLabels[row.session] ?? row.session}
                          {row.note ? ` · ${row.note}` : ""}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => void remove(row)}
                      >
                        Hapus
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              {hasMore && (
                <Button
                  variant="outline"
                  className="mt-3"
                  disabled={detailLoading}
                  onClick={() =>
                    void loadDetail(
                      selection,
                      unclaimedSession,
                      claims.length,
                      true,
                    )
                  }
                >
                  Muat lebih banyak
                </Button>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
