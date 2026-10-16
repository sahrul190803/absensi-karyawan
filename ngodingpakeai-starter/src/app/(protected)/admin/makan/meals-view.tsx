"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Claim = {
  id: string;
  date: string;
  session: string;
  note: string;
  employeeName: string;
  employeeNik: string;
  departmentName: string | null;
};

type Totals = { total: number; pagi: number; siang: number; malam: number };

const sessionLabels: Record<string, string> = {
  pagi: "Makan pagi",
  siang: "Makan siang",
  malam: "Makan malam",
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
  const [rows, setRows] = useState<Claim[]>([]);
  const [totals, setTotals] = useState<Totals>({
    total: 0,
    pagi: 0,
    siang: 0,
    malam: 0,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const response = await fetch(`/api/admin/meals?${params}`, {
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Gagal memuat rekap klaim makan.");
        return;
      }
      setRows(body.data);
      setTotals(body.meta?.totals ?? { total: 0, pagi: 0, siang: 0, malam: 0 });
      setError(null);
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

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
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Klaim makan
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rekap pembagian makan karyawan per periode.
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
        <Button variant="outline" onClick={() => void load()}>
          Muat ulang
        </Button>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <dt className="text-sm text-muted-foreground">Total klaim</dt>
          <dd className="mt-1 font-mono text-2xl font-medium">{totals.total}</dd>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <dt className="text-sm text-muted-foreground">Pagi</dt>
          <dd className="mt-1 font-mono text-2xl font-medium">{totals.pagi}</dd>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <dt className="text-sm text-muted-foreground">Siang</dt>
          <dd className="mt-1 font-mono text-2xl font-medium">{totals.siang}</dd>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <dt className="text-sm text-muted-foreground">Malam</dt>
          <dd className="mt-1 font-mono text-2xl font-medium">{totals.malam}</dd>
        </div>
      </dl>

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Memuat…</p>
      ) : rows.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed bg-card px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Tidak ada klaim pada periode ini.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-2">
          {rows.map((row) => (
            <li
              key={row.id}
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
                    {row.departmentName ?? "—"} · {row.date} ·{" "}
                    {sessionLabels[row.session] ?? row.session}
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
      )}
    </div>
  );
}
