"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Check } from "lucide-react";
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
  // Pilihan berupa teks yang bisa diketik untuk mencari (mis. nama HOD).
  searchable?: boolean;
  // Kirim null saat dikosongkan supaya pilihan opsional bisa dilepas kembali.
  nullable?: boolean;
  defaultValue?: string | number | boolean;
};

export type MasterFilter = {
  key: string;
  label: string;
  optionsFrom?: NonNullable<MasterField["optionsFrom"]>;
  options?: { value: string; label: string }[];
};

export type MasterApprove = {
  key: string;
  when: string;
  value: string;
  label: string;
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

// Combobox sederhana: ketik untuk menyaring, pilih dengan klik atau Enter.
function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  nullable = false,
}: {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  nullable?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();

  const selected = options.find((option) => option.value === value) ?? null;
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(needle),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setEditing(false);
        setQuery("");
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
    setEditing(false);
    setQuery("");
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        className="h-10 w-full rounded-md border border-border bg-card px-3 pr-9 text-sm"
        value={editing ? query : (selected?.label ?? "")}
        placeholder={placeholder ?? "Ketik untuk mencari..."}
        onFocus={() => {
          setOpen(true);
          setEditing(true);
          setQuery("");
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setEditing(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            setEditing(false);
            setQuery("");
          }
          if (event.key === "Enter" && open && filtered.length === 1) {
            event.preventDefault();
            choose(filtered[0].value);
          }
        }}
      />
      {nullable && value && (
        <button
          type="button"
          aria-label="Kosongkan pilihan"
          className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => choose("")}
        >
          ×
        </button>
      )}
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-card py-1 shadow-lg"
        >
          {nullable && (
            <li>
              <button
                type="button"
                role="option"
                aria-selected={!value}
                className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
                onClick={() => choose("")}
              >
                Tidak ada
              </button>
            </li>
          )}
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              Tidak ada yang cocok.
            </li>
          ) : (
            filtered.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-muted ${
                    option.value === value ? "bg-primary-quiet" : ""
                  }`}
                  onClick={() => choose(option.value)}
                >
                  {option.label}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

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
  filters = [],
  approve,
  canCreate = true,
  canDelete = true,
}: {
  title: string;
  description: string;
  endpoint: string;
  columns: MasterColumn[];
  fields: MasterField[];
  filters?: MasterFilter[];
  approve?: MasterApprove;
  canCreate?: boolean;
  canDelete?: boolean;
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
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLElement | null>(null);

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
    const sources = [
      ...fields.map((field) => field.optionsFrom),
      ...filters.map((filter) => filter.optionsFrom),
    ].filter((source): source is NonNullable<MasterField["optionsFrom"]> =>
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
  }, [fields, filters]);

  const defaultValues = useCallback((): Values => {
    const next: Values = {};
    for (const field of fields) {
      next[field.key] =
        field.defaultValue ??
        (field.type === "boolean" ? false : "");
    }
    return next;
  }, [fields]);

  const revealForm = useCallback(() => {
    window.requestAnimationFrame(() => {
      const form = formRef.current;
      if (!form) return;
      form.scrollIntoView({ behavior: "smooth", block: "start" });
      form
        .querySelector<HTMLElement>("input, select, textarea")
        ?.focus({ preventScroll: true });
    });
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setValues(defaultValues());
    setNewOptions({});
    setFormOpen(true);
    setNotice(null);
    revealForm();
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
    revealForm();
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

  const approveItem = useCallback(
    async (item: Item) => {
      if (!approve) return;
      setBusy(true);
      setError(null);
      try {
        const response = await fetch(`${endpoint}/${String(item.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [approve.key]: approve.value }),
        });
        const body = await response.json();
        if (!response.ok) {
          setError(body?.error?.message ?? "Data gagal diverifikasi.");
          return;
        }
        setNotice(`${String(item.fullName ?? item.name ?? "Data")} diverifikasi.`);
        await load();
      } catch {
        setError("Jaringan bermasalah. Coba lagi.");
      } finally {
        setBusy(false);
      }
    },
    [approve, endpoint, load],
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

  const activeFilters = filters.filter(
    (filter) => filterValues[filter.key],
  );

  const visible = items.filter((item) => {
    const needle = query.trim().toLowerCase();
    const matchesQuery =
      !needle || JSON.stringify(item).toLowerCase().includes(needle);
    const matchesFilters = filters.every(
      (filter) =>
        !filterValues[filter.key] ||
        String(item[filter.key] ?? "") === filterValues[filter.key],
    );
    return matchesQuery && matchesFilters;
  });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {canCreate && (
          <Button size="sm" onClick={openCreate}>
            Tambah
          </Button>
        )}
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
        <section
          ref={formRef}
          className="mt-6 scroll-mt-24 rounded-lg border bg-card p-5"
        >
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
                ) : field.type === "select" && field.searchable ? (
                  <SearchableSelect
                    options={
                      field.optionsFrom
                        ? (optionMaps[field.optionsFrom.endpoint] ?? [])
                        : (field.options ?? []).map((option) => ({
                            value: option,
                            label: option,
                          }))
                    }
                    value={String(values[field.key] ?? "")}
                    onChange={(next) =>
                      setValues((prev) => ({
                        ...prev,
                        [field.key]: next,
                      }))
                    }
                    placeholder={`Cari ${field.label.toLowerCase()}...`}
                    nullable={field.nullable}
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

      <div className="mt-6 space-y-3">
        {filters.length > 0 && (
          <div className="flex flex-wrap items-end gap-2">
            {filters.map((filter) => (
              <label
                key={filter.key}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                {filter.label}
                <select
                  className="h-9 rounded-md border border-border bg-card px-2 text-sm text-foreground"
                  value={filterValues[filter.key] ?? ""}
                  onChange={(event) =>
                    setFilterValues((previous) => ({
                      ...previous,
                      [filter.key]: event.target.value,
                    }))
                  }
                >
                  <option value="">Semua {filter.label.toLowerCase()}</option>
                  {(filter.optionsFrom
                    ? (optionMaps[filter.optionsFrom.endpoint] ?? [])
                    : (filter.options ?? [])
                  ).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            {activeFilters.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterValues({})}
              >
                Reset filter
              </Button>
            )}
          </div>
        )}
        <input
          type="search"
          placeholder="Cari..."
          aria-label={`Cari ${title}`}
          className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

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
                <div className="flex flex-wrap gap-2">
                  {approve && String(item[approve.key] ?? "") === approve.when && (
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => void approveItem(item)}
                    >
                      <Check aria-hidden="true" />
                      {approve.label}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => openEdit(item)}
                  >
                    Ubah
                  </Button>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => void remove(item)}
                    >
                      Hapus
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
