"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

type ImportError = { row: number; message: string };

export function CsvImport({
  endpoint,
  columns,
}: {
  endpoint: string;
  columns: string[];
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errors, setErrors] = useState<ImportError[]>([]);

  const onFile = async (file: File) => {
    setBusy(true);
    setNotice(null);
    setErrors([]);
    try {
      const csv = await file.text();
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const body = await response.json();
      if (!response.ok) {
        setErrors(body?.error?.details ?? []);
        setNotice(
          body?.error?.message ??
            "Impor gagal. Periksa format file dan coba lagi.",
        );
        return;
      }
      setNotice(`Impor berhasil: ${body.data?.imported ?? 0} baris ditambahkan.`);
    } catch {
      setNotice("Gagal membaca file. Coba lagi.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Impor CSV</p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            Kolom: {columns.join(", ")}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <Upload aria-hidden="true" />
          {busy ? "Mengimpor…" : "Pilih file CSV"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void onFile(file);
          }}
        />
      </div>
      {notice && (
        <p role="status" className="mt-3 text-sm">
          {notice}
        </p>
      )}
      {errors.length > 0 && (
        <ul className="mt-3 max-h-48 space-y-1 overflow-auto rounded-lg border bg-card px-3 py-2 text-xs">
          {errors.slice(0, 100).map((error, index) => (
            <li key={index}>
              <span className="font-mono text-muted-foreground">
                Baris {error.row}:
              </span>{" "}
              {error.message}
            </li>
          ))}
          {errors.length > 100 && (
            <li className="text-muted-foreground">
              …dan {errors.length - 100} kesalahan lainnya.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
