"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clock, formatDate, statusLabel } from "@/lib/format";

type DailyRow = {
  employeeId: string;
  employeeName: string;
  employeeNik: string;
  photoUrl: string | null;
  departmentName: string | null;
  positionName: string | null;
  salaryType: string;
  status: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  lateMinutes: number;
  alphaDays: number;
  permissionDays: number;
  baseAmount: string;
  lateDeduction: string;
  alphaDeduction: string;
  permissionDeduction: string;
  totalDeduction: string;
  netAmount: string;
  isPaid: boolean;
};

type DailyData = {
  date: string;
  year: number;
  month: number;
  rows: DailyRow[];
};

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const todayIso = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

export function DailyPayroll() {
  const [date, setDate] = useState(todayIso);
  const [data, setData] = useState<DailyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [method, setMethod] = useState("transfer");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/payroll/daily?date=${encodeURIComponent(date)}`,
        { cache: "no-store" },
      );
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Gagal memuat gaji harian.");
        return;
      }
      setData(body.data);
      setSelected([]);
      setError(null);
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const unpaid = useMemo(() => rows.filter((row) => !row.isPaid), [rows]);
  const selectedUnpaid = unpaid.filter((row) =>
    selected.includes(row.employeeId),
  );

  const toggle = (employeeId: string) => {
    setSelected((current) =>
      current.includes(employeeId)
        ? current.filter((value) => value !== employeeId)
        : [...current, employeeId],
    );
  };

  const pay = async (employeeIds: string[], label: string) => {
    if (employeeIds.length === 0) return;
    if (!window.confirm(label)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/payroll/daily/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, employeeIds, method }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(
          body?.error?.details?.[0]?.message ??
            body?.error?.message ??
            "Gagal membayar gaji harian.",
        );
        return;
      }
      setNotice(
        `${body.data?.paid ?? employeeIds.length} gaji harian dibayarkan. Notifikasi sudah dikirim.`,
      );
      await load();
    } catch {
      setError("Jaringan bermasalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const exportHref = (format: string) =>
    `/api/admin/payroll/daily/export?format=${format}&date=${encodeURIComponent(date)}`;

  return (
    <div className="space-y-5">
      {notice && (
        <p
          role="status"
          className="rounded-lg border bg-card px-4 py-3 text-sm"
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

      <section className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Bayar gaji harian</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Gaji dihitung dari jadwal, absensi, dan pengajuan pada tanggal
              terpilih.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-xs text-muted-foreground">
              Tanggal
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="h-9 rounded-md border border-border bg-card px-2 text-sm text-foreground"
              />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Metode
              <select
                value={method}
                onChange={(event) => setMethod(event.target.value)}
                className="h-9 rounded-md border border-border bg-card px-2 text-sm text-foreground"
              >
                <option value="transfer">Transfer bank</option>
                <option value="cash">Tunai</option>
              </select>
            </label>
            <Button variant="outline" size="sm" asChild>
              <a href={exportHref("pdf")}>PDF</a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={exportHref("xls")}>Excel</a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={exportHref("csv")}>CSV</a>
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={busy || unpaid.length === 0}
            onClick={() =>
              setSelected(
                selected.length === unpaid.length
                  ? []
                  : unpaid.map((row) => row.employeeId),
              )
            }
          >
            {selected.length === unpaid.length && unpaid.length > 0
              ? "Kosongkan pilihan"
              : "Pilih semua"}
          </Button>
          <Button
            size="sm"
            disabled={busy || selectedUnpaid.length === 0}
            onClick={() =>
              void pay(
                selectedUnpaid.map((row) => row.employeeId),
                `Bayar gaji harian ${selectedUnpaid.length} karyawan?`,
              )
            }
          >
            Bayar terpilih ({selectedUnpaid.length})
          </Button>
          <Button
            size="sm"
            disabled={busy || unpaid.length === 0}
            onClick={() =>
              void pay(
                unpaid.map((row) => row.employeeId),
                `Bayar semua gaji harian yang belum dibayar (${unpaid.length} karyawan)?`,
              )
            }
          >
            <Wallet aria-hidden="true" />
            Bayar semua
          </Button>
          <span className="ml-auto font-mono text-xs text-muted-foreground">
            {formatDate(date)} · {rows.length} karyawan · {unpaid.length} belum
            dibayar
          </span>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Memuat gaji harian…
          </p>
        ) : error ? null : rows.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            Tidak ada karyawan yang dijadwalkan pada tanggal ini.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase">
                  <th className="py-2 pr-3 font-medium">
                    <span className="sr-only">Pilih</span>
                  </th>
                  <th className="py-2 pr-3 font-medium">Nama</th>
                  <th className="py-2 pr-3 font-medium">Jabatan</th>
                  <th className="py-2 pr-3 font-medium">Absensi</th>
                  <th className="py-2 pr-3 text-right font-medium">Telat</th>
                  <th className="py-2 pr-3 text-right font-medium">
                    Gaji harian
                  </th>
                  <th className="py-2 pr-3 text-right font-medium">Potongan</th>
                  <th className="py-2 pr-3 text-right font-medium">
                    Gaji bersih
                  </th>
                  <th className="py-2 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.employeeId}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-2 pr-3">
                      {!row.isPaid && (
                        <input
                          type="checkbox"
                          className="size-4"
                          aria-label={`Pilih ${row.employeeName}`}
                          checked={selected.includes(row.employeeId)}
                          onChange={() => toggle(row.employeeId)}
                        />
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <span className="block font-medium">
                        {row.employeeName}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {row.employeeNik}
                      </span>
                      {row.isPaid && (
                        <span className="ml-2 rounded-full bg-positive px-2 py-0.5 text-[10px] font-semibold text-white">
                          Lunas
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3">{row.positionName ?? "—"}</td>
                    <td className="py-2 pr-3 text-xs">
                      <span className="block">{statusLabel(row.status)}</span>
                      <span className="font-mono text-muted-foreground">
                        {clock(row.checkInTime)}–{clock(row.checkOutTime)}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right font-mono">
                      {row.lateMinutes} mnt
                    </td>
                    <td className="py-2 pr-3 text-right font-mono">
                      {rupiah.format(Number(row.baseAmount))}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-danger">
                      {rupiah.format(Number(row.totalDeduction))}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono font-semibold">
                      {rupiah.format(Number(row.netAmount))}
                    </td>
                    <td className="py-2 text-right">
                      {!row.isPaid && (
                        <Button
                          variant="outline"
                          size="xs"
                          disabled={busy}
                          onClick={() =>
                            void pay(
                              [row.employeeId],
                              `Bayar gaji harian ${row.employeeName}?`,
                            )
                          }
                        >
                          Bayar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
