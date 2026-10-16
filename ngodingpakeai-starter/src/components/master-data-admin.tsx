"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export type MasterFieldType =
  | "text"
  | "number"
  | "date"
  | "time"
  | "select"
  | "boolean";

export type MasterField = {
  key: string;
  label: string;
  type: MasterFieldType;
  required?: boolean;
  options?: string[];
  optionsFrom?: {
    endpoint: string;
    labelKey: string;
    // Kolom yang disimpan sebagai nilai; default "id". Mis. kepala divisi
    // menyimpan userId, bukan id baris karyawan.
    valueKey?: string;
    // Izinkan pembuatan data baru langsung dari form (mis. departemen atau
    // jabatan baru saat menambah karyawan).
    create?: { nameKey: string };
  };
  // Kirim null saat dikosongkan supaya pilihan opsional bisa dilepas kembali.
  nullable?: boolean;
  defaultValue?: string | number | boolean;
};

export type MasterColumn = {
  key: string;
  label: string;
  format?: "text" | "mono" | "date" | "time" | "boolean" | "document";
  valueLabels?: Record<string, string>;
};

type Item = Record<string, unknown>;
type Values = Record<string, string | number | boolean>;
type Option = { value: string; label: string };

const formatDate = (value: unknown) => {
  const text = String(value);
  const date = new Date(`${text}T00:00:00`);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export function MasterDataAdmin({
  title,
  description,
  endpoint,
  columns,
  fields,
}: {
  title: string;
  description: string;
  endpoint: string;
  columns: MasterColumn[];
  fields: MasterField[];
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [optionMaps, setOptionMaps] = useState<Record<string, Option[]>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState<Values>({});
  const [newOptions, setNewOptions] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch(`${endpoint}?limit=200`, {
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Gagal memuat data.");
        return;
      }
      setItems(body.data);
      setError(null);
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const sources = fields
      .map((field) => field.optionsFrom)
      .filter((source): source is NonNullable<MasterField["optionsFrom"]> =>
        Boolean(source),
      );
    const unique = Array.from(
      new Map(sources.map((source) => [source.endpoint, source])).values(),
    );
    if (unique.length === 0) return;
    const timer = window.setTimeout(async () => {
      const entries: [string, Option[]][] = [];
      for (const source of unique) {
        try {
          const response = await fetch(`${source.endpoint}?limit=200`, {
            cache: "no-store",
          });
          const body = await response.json();
          if (response.ok) {
            entries.push([
              source.endpoint,
              body.data.map((row: Record<string, unknown>) => ({
                value: String(row[source.valueKey ?? "id"]),
                label: String(row[source.labelKey] ?? row.id),
              })),
            ]);
          }
        } catch {
          // ignore option load errors; the form still works for other fields
        }
      }
      setOptionMaps(Object.fromEntries(entries));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fields]);

  const defaultValues = useCallback((): Values => {
    const next: Values = {};
    for (const field of fields) {
      next[field.key] =
        field.defaultValue ??
        (field.type === "boolean" ? false : "");
    }
    return next;
  }, [fields]);

  const openCreate = () => {
    setEditingId(null);
    setValues(defaultValues());
    setNewOptions({});
    setFormOpen(true);
    setNotice(null);
  };

  const openEdit = (item: Item) => {
    const next: Values = {};
    for (const field of fields) {
      const raw = item[field.key];
      if (field.type === "boolean") next[field.key] = Boolean(raw);
      else if (field.type === "time" && raw) next[field.key] = String(raw).slice(0, 5);
      else next[field.key] = raw === null || raw === undefined ? "" : String(raw);
    }
    setEditingId(String(item.id));
    setValues(next);
    setNewOptions({});
    setFormOpen(true);
    setNotice(null);
  };

  // Buat opsi baru (departemen/jabatan) langsung dari form, lalu pakai id-nya.
  const createOption = useCallback(
    async (
      source: NonNullable<MasterField["optionsFrom"]>,
      name: string,
      fieldLabel: string,
    ): Promise<Option | null> => {
      const response = await fetch(source.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [source.create?.nameKey ?? "name"]: name }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(
          body?.error?.details?.[0]?.message ??
            body?.error?.message ??
            `${fieldLabel} baru gagal dibuat.`,
        );
        return null;
      }
      const option = {
        value: String(body.data[source.valueKey ?? "id"]),
        label: String(body.data[source.labelKey] ?? name),
      };
      setOptionMaps((previous) => ({
        ...previous,
        [source.endpoint]: [...(previous[source.endpoint] ?? []), option],
      }));
      return option;
    },
    [],
  );

  const submit = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {};
      for (const field of fields) {
        let raw = values[field.key];
        if (
          field.type === "select" &&
          field.optionsFrom?.create &&
          String(raw) === "__create__"
        ) {
          const name = (newOptions[field.key] ?? "").trim();
          if (!name) {
            setError(`Isi nama ${field.label.toLowerCase()} baru terlebih dahulu.`);
            return;
          }
          const option = await createOption(field.optionsFrom, name, field.label);
          if (!option) return;
          raw = option.value;
          setValues((previous) => ({ ...previous, [field.key]: option.value }));
        }
        if (field.type === "boolean") {
          payload[field.key] = Boolean(raw);
          continue;
        }
        const text = String(raw ?? "").trim();
        if (!text) {
          if (field.nullable) {
            payload[field.key] = null;
            continue;
          }
          if (!field.required) continue;
          payload[field.key] = field.type === "number" ? Number.NaN : "";
          continue;
        }
        payload[field.key] = field.type === "number" ? Number(text) : text;
      }

      const response = await fetch(
        editingId ? `${endpoint}/${editingId}` : endpoint,
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        setError(
          body?.error?.details?.[0]?.message ??
            body?.error?.message ??
            "Data gagal disimpan.",
        );
        return;
      }
      setNotice(editingId ? "Data diperbarui." : "Data ditambahkan.");
      setFormOpen(false);
      setEditingId(null);
      setNewOptions({});
      await load();
    } catch {
      setError("Jaringan bermasalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }, [createOption, editingId, endpoint, fields, load, newOptions, values]);

  const remove = useCallback(
    async (item: Item) => {
      const label = item.name ?? item.fullName ?? item.code ?? item.id;
      if (!window.confirm(`Hapus ${String(label)}? Tindakan ini permanen.`))
        return;
      setBusy(true);
      setError(null);
      try {
        const response = await fetch(`${endpoint}/${String(item.id)}`, {
          method: "DELETE",
        });
        if (!response.ok && response.status !== 204) {
          const body = await response.json();
          setError(body?.error?.message ?? "Gagal menghapus data.");
          return;
        }
        setNotice("Data dihapus.");
        await load();
      } finally {
        setBusy(false);
      }
    },
    [endpoint, load],
  );

  const displayValue = (item: Item, column: MasterColumn) => {
    const raw = item[column.key];
    if (raw === null || raw === undefined || raw === "") return "—";
    const field = fields.find((entry) => entry.key === column.key);
    if (field?.optionsFrom) {
      const options = optionMaps[field.optionsFrom.endpoint] ?? [];
      const match = options.find((option) => option.value === String(raw));
      if (match) return match.label;
    }
    if (column.valueLabels?.[String(raw)])
      return column.valueLabels[String(raw)];
    if (column.format === "boolean") return raw ? "Ya" : "Tidak";
    if (column.format === "date") return formatDate(raw);
    if (column.format === "time") return String(raw).slice(0, 5);
    return String(raw);
  };

  const visible = query
    ? items.filter((item) =>
        JSON.stringify(item).toLowerCase().includes(query.toLowerCase()),
      )
    : items;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          Tambah
        </Button>
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

      {formOpen && (
        <section className="mt-6 rounded-lg border bg-card p-5">
          <h2 className="text-lg font-semibold">
            {editingId ? "Ubah data" : "Tambah data"}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {fields.map((field) => (
              <label key={field.key} className="grid gap-1.5 text-sm">
                <span className="font-medium">
                  {field.label}
                  {field.required ? " *" : ""}
                </span>
                {field.type === "boolean" ? (
                  <input
                    type="checkbox"
                    className="size-4 accent-current"
                    checked={Boolean(values[field.key])}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        [field.key]: event.target.checked,
                      }))
                    }
                  />
                ) : field.type === "select" ? (
                  <>
                    <select
                      className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                      value={String(values[field.key] ?? "")}
                      onChange={(event) =>
                        setValues((prev) => ({
                          ...prev,
                          [field.key]: event.target.value,
                        }))
                      }
                    >
                      <option value="">Pilih…</option>
                      {(field.options ??
                        (field.optionsFrom
                          ? (optionMaps[field.optionsFrom.endpoint] ?? []).map(
                              (option) => option.value,
                            )
                          : [])
                      ).map((option) => (
                        <option key={option} value={option}>
                          {field.optionsFrom
                            ? ((optionMaps[field.optionsFrom.endpoint] ?? []).find(
                                (entry) => entry.value === option,
                              )?.label ?? option)
                            : option}
                        </option>
                      ))}
                      {field.optionsFrom?.create && (
                        <option value="__create__">+ Tambah baru…</option>
                      )}
                    </select>
                    {field.optionsFrom?.create &&
                      String(values[field.key] ?? "") === "__create__" && (
                        <input
                          className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                          placeholder={`Nama ${field.label.toLowerCase()} baru`}
                          aria-label={`Nama ${field.label.toLowerCase()} baru`}
                          value={newOptions[field.key] ?? ""}
                          onChange={(event) =>
                            setNewOptions((previous) => ({
                              ...previous,
                              [field.key]: event.target.value,
                            }))
                          }
                        />
                      )}
                  </>
                ) : (
                  <input
                    type={
                      field.type === "number"
                        ? "number"
                        : field.type === "date"
                          ? "date"
                          : field.type === "time"
                            ? "time"
                            : "text"
                    }
                    step={field.type === "number" ? "any" : undefined}
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                    value={String(values[field.key] ?? "")}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        [field.key]: event.target.value,
                      }))
                    }
                  />
                )}
              </label>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Button disabled={busy} onClick={() => void submit()}>
              {busy ? "Menyimpan…" : "Simpan"}
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setFormOpen(false)}
            >
              Batal
            </Button>
          </div>
        </section>
      )}

      <input
        type="search"
        placeholder="Cari…"
        aria-label={`Cari ${title}`}
        className="mt-6 h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Memuat…</p>
      ) : visible.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed bg-card px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Tidak ada data yang cocok.
          </p>
        </div>
      ) : (
        <ul className="mt-4 grid gap-3">
          {visible.map((item) => (
            <li key={String(item.id)} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <dl className="grid flex-1 gap-1 text-sm sm:grid-cols-2">
                  {columns.map((column) => (
                    <div
                      key={column.key}
                      className="flex items-baseline justify-between gap-3 sm:justify-start"
                    >
                      <dt className="text-muted-foreground">{column.label}</dt>
                      <dd className={column.format === "mono" ? "font-mono" : ""}>
                        {column.format === "document" ? (
                          item[column.key] ? (
                            <a
                              href={`/api/employees/${String(item.id)}/documents/${
                                column.key.toLowerCase().includes("ktp")
                                  ? "ktp"
                                  : "photo"
                              }`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-primary-text underline underline-offset-4"
                            >
                              Lihat
                            </a>
                          ) : (
                            "—"
                          )
                        ) : (
                          displayValue(item, column)
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => openEdit(item)}
                  >
                    Ubah
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => void remove(item)}
                  >
                    Hapus
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
