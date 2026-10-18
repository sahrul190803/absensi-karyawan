"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime, initials } from "@/lib/format";

type Option = { id: string; name: string };

type PaymentRow = {
  id: string;
  employeeName: string;
  employeeNik: string;
  photoUrl: string | null;
  departmentName: string | null;
  positionName: string | null;
  periodLabel: string;
  periodYear: number;
  periodMonth: number;
  paymentDate: string;
  baseSalary: string;
  allowance: string;
  grossAmount: string;
  totalDeduction: string;
  overtimeAmount: string;
  adjustment: string;
  netAmount: string;
  status: string;
  method: string;
  isHidden: boolean;
};

type PaymentDetail = PaymentRow & {
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
  companyName: string;
};

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const STATUS_LABELS: Record<string, string> = {
  paid: "Lunas",
  pending: "Menunggu",
};

const METHOD_LABELS: Record<string, string> = {
  transfer: "Transfer bank",
  cash: "Tunai",
};

const PAGE_SIZE = 20;

export function PaymentHistory() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [positions, setPositions] = useState<Option[]>([]);
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [positionId, setPositionId] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<PaymentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String((page - 1) * PAGE_SIZE),
      });
      if (month) params.set("month", month);
      if (year) params.set("year", year);
      if (positionId) params.set("positionId", positionId);
      const response = await fetch(
        `/api/admin/payroll/payments?${params.toString()}`,
        { cache: "no-store" },
      );
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Gagal memuat riwayat pembayaran.");
        return;
      }
      setRows(body.data ?? []);
      setHasMore(Boolean(body.meta?.hasMore));
      setError(null);
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setLoading(false);
    }
  }, [month, page, positionId, year]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/positions?limit=200", {
          cache: "no-store",
        });
        const body = await response.json();
        if (response.ok) setPositions(body.data ?? []);
      } catch {
        // Filter jabatan opsional.
      }
    })();
  }, []);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/payroll/payments/${id}`, {
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Gagal memuat slip gaji.");
        return;
      }
      setDetail(body.data);
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setDetailLoading(false);
    }
  };

  const exportQuery = () => {
    const params = new URLSearchParams();
    if (month) params.set("month", month);
    if (year) params.set("year", year);
    if (positionId) params.set("positionId", positionId);
    return params.toString();
  };
  const exportHref = (format: string) => {
    const query = exportQuery();
    return `/api/admin/payroll/payments/export?format=${format}${query ? `&${query}` : ""}`;
  };

  const years = Array.from({ length: 4 }, (_, index) =>
    String(new Date().getFullYear() - index),
  );

  return (
    <div className="space-y-5">
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <section className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Riwayat pembayaran gaji</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Klik baris untuk melihat detail slip gaji.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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
          <select
            aria-label="Filter bulan"
            value={month}
            onChange={(event) => {
              setMonth(event.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-border bg-card px-2 text-sm text-foreground"
          >
            <option value="">Semua bulan</option>
            {MONTHS.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter tahun"
            value={year}
            onChange={(event) => {
              setYear(event.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-border bg-card px-2 text-sm text-foreground"
          >
            <option value="">Semua tahun</option>
            {years.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter jabatan"
            value={positionId}
            onChange={(event) => {
              setPositionId(event.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-border bg-card px-2 text-sm text-foreground"
          >
            <option value="">Semua jabatan</option>
            {positions.map((position) => (
              <option key={position.id} value={position.id}>
                {position.name}
              </option>
            ))}
          </select>
          <span className="ml-auto font-mono text-xs text-muted-foreground">
            {rows.length} pembayaran
          </span>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Memuat riwayat pembayaran…
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase">
                  <th className="py-2 pr-3 font-medium">Tanggal bayar</th>
                  <th className="py-2 pr-3 font-medium">Periode</th>
                  <th className="py-2 pr-3 font-medium">Nama</th>
                  <th className="py-2 pr-3 font-medium">Jabatan</th>
                  <th className="py-2 pr-3 text-right font-medium">
                    Gaji pokok
                  </th>
                  <th className="py-2 pr-3 text-right font-medium">
                    Total potongan
                  </th>
                  <th className="py-2 pr-3 text-right font-medium">
                    Gaji bersih
                  </th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 font-medium">Metode</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40"
                    onClick={() => void openDetail(row.id)}
                  >
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {formatDate(row.paymentDate.slice(0, 10), {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-2 pr-3">{row.periodLabel}</td>
                    <td className="py-2 pr-3">
                      <span className="block font-medium">
                        {row.employeeName}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {row.employeeNik}
                      </span>
                    </td>
                    <td className="py-2 pr-3">{row.positionName ?? "—"}</td>
                    <td className="py-2 pr-3 text-right font-mono">
                      {rupiah.format(Number(row.baseSalary))}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono">
                      {rupiah.format(Number(row.totalDeduction))}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono font-semibold">
                      {rupiah.format(Number(row.netAmount))}
                    </td>
                    <td className="py-2 pr-3">
                      <span className="rounded-full bg-positive px-2 py-0.5 text-[11px] font-semibold text-white">
                        {STATUS_LABELS[row.status] ?? row.status}
                      </span>
                    </td>
                    <td className="py-2">
                      {METHOD_LABELS[row.method] ?? row.method}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Belum ada pembayaran pada filter ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">Halaman {page}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasMore}
              onClick={() => setPage(page + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      </section>

      {(detail || detailLoading) && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Detail slip gaji"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs tracking-wide text-muted-foreground uppercase">
                  {detail?.companyName ?? "HadirKu"}
                </p>
                <h2 className="text-lg font-semibold">Slip Gaji</h2>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Tutup"
                onClick={() => setDetail(null)}
              >
                <X aria-hidden="true" />
              </Button>
            </div>

            {detailLoading && !detail ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Memuat slip gaji…
              </p>
            ) : detail ? (
              <>
                <div className="mt-4 flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full border border-border bg-muted text-xs font-semibold">
                    {initials(detail.employeeName)}
                  </span>
                  <div>
                    <p className="font-medium">{detail.employeeName}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {detail.employeeNik} · {detail.positionName ?? "—"}
                    </p>
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Periode</dt>
                    <dd>{detail.periodLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Tanggal bayar
                    </dt>
                    <dd>{formatDateTime(detail.paymentDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Metode</dt>
                    <dd>{METHOD_LABELS[detail.method] ?? detail.method}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Status</dt>
                    <dd>{STATUS_LABELS[detail.status] ?? detail.status}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">Rekening</dt>
                    <dd>
                      {detail.bankName || detail.bankAccount
                        ? `${detail.bankName} ${detail.bankAccount} a.n. ${detail.bankAccountName || detail.employeeName}`
                        : "—"}
                    </dd>
                  </div>
                </dl>

                <dl className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt>Gaji pokok</dt>
                    <dd className="font-mono">
                      {rupiah.format(Number(detail.baseSalary))}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Tunjangan</dt>
                    <dd className="font-mono">
                      {rupiah.format(Number(detail.allowance))}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 font-medium">
                    <dt>Gaji kotor</dt>
                    <dd className="font-mono">
                      {rupiah.format(Number(detail.grossAmount))}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 text-danger">
                    <dt>Total potongan</dt>
                    <dd className="font-mono">
                      -{rupiah.format(Number(detail.totalDeduction))}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Lembur</dt>
                    <dd className="font-mono">
                      {rupiah.format(Number(detail.overtimeAmount))}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Penyesuaian</dt>
                    <dd className="font-mono">
                      {rupiah.format(Number(detail.adjustment))}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 border-t border-border pt-2 text-base font-semibold">
                    <dt>Gaji bersih</dt>
                    <dd className="font-mono">
                      {rupiah.format(Number(detail.netAmount))}
                    </dd>
                  </div>
                </dl>

                {detail.isHidden && (
                  <p className="mt-3 rounded-md border border-border-strong bg-primary-quiet px-3 py-2 text-xs text-foreground">
                    Detail potongan disembunyikan dari karyawan. Karyawan hanya
                    melihat gaji bersih.
                  </p>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
