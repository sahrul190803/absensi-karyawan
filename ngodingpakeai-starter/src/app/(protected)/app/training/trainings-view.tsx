"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Training = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  place: string;
  notes: string;
};

const formatDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export function TrainingsView() {
  const [rows, setRows] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/trainings", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Gagal memuat jadwal training.");
        return;
      }
      setRows(body.data);
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

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Jadwal training
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Training mendatang untuk Anda dan seluruh perusahaan.
      </p>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Memuat…</p>
      ) : rows.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed bg-card px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Belum ada jadwal training mendatang.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg border bg-card p-4">
              <p className="font-medium">{row.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatDate(row.date)} · {row.startTime.slice(0, 5)}–
                {row.endTime.slice(0, 5)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {row.place || "Tempat menyusul"}
              </p>
              {row.notes && (
                <p className="mt-2 text-sm leading-6">{row.notes}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <Button variant="ghost" className="mt-6" asChild>
        <Link href="/app">Kembali ke beranda</Link>
      </Button>
    </div>
  );
}
