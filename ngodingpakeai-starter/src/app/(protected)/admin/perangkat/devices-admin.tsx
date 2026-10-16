"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Device = {
  id: string;
  os: string;
  model: string;
  browser: string;
  trusted: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  employeeName: string | null;
  employeeNik: string | null;
  userEmail: string | null;
};

export function DevicesAdmin() {
  const [rows, setRows] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/devices?limit=200", {
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Gagal memuat daftar perangkat.");
        return;
      }
      setRows(body.data ?? []);
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

  const revoke = async (id: string) => {
    setBusyId(id);
    try {
      const response = await fetch(`/api/devices/${id}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Gagal mencabut perangkat.");
        return;
      }
      setRows((current) => current.filter((row) => row.id !== id));
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Perangkat
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Perangkat yang pernah dipakai absen. Mencabut perangkat memaksanya
        tercatat ulang saat absen berikutnya.
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
        <p className="mt-6 text-sm text-muted-foreground">Memuat perangkat…</p>
      ) : rows.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed bg-card px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Belum ada perangkat tercatat.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  {row.employeeName ?? row.userEmail ?? "Karyawan tidak dikenal"}
                  {row.employeeNik && (
                    <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                      {row.employeeNik}
                    </span>
                  )}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busyId === row.id}
                  onClick={() => void revoke(row.id)}
                >
                  {busyId === row.id ? "Mencabut…" : "Cabut"}
                </Button>
              </div>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {row.model} · {row.os} · {row.browser}
                {row.lastLoginAt
                  ? ` · terakhir ${new Date(row.lastLoginAt).toLocaleString("id-ID")}`
                  : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
