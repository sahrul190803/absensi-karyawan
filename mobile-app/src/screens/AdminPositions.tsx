import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, LoaderCircle, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiFetch, ApiError } from "@/lib/api";
import type { DepartmentRow, PositionRow } from "@/lib/admin-types";

type PositionResponse = { data: PositionRow[] };
type DepartmentResponse = { data: DepartmentRow[] };

export function AdminPositionsScreen() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PositionRow | null>(null);
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [level, setLevel] = useState("1");
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const positionsQuery = useQuery({
    queryKey: ["admin", "positions"],
    queryFn: () =>
      apiFetch<PositionResponse>("/api/positions?limit=200&offset=0"),
    retry: false,
  });
  const departmentsQuery = useQuery({
    queryKey: ["admin", "departments"],
    queryFn: () =>
      apiFetch<DepartmentResponse>("/api/departments?limit=200&offset=0"),
    retry: false,
  });

  const rows = positionsQuery.data?.data ?? [];
  const departments = departmentsQuery.data?.data ?? [];
  const departmentName = (id: string | null) =>
    departments.find((department) => department.id === id)?.name ?? "—";

  function openCreate() {
    setEditing(null);
    setName("");
    setDepartmentId("");
    setLevel("1");
    setActive(true);
    setFormOpen(true);
    setNotice(null);
    setError(null);
  }

  function openEdit(row: PositionRow) {
    setEditing(row);
    setName(row.name);
    setDepartmentId(row.departmentId ?? "");
    setLevel(String(row.level));
    setActive(row.active);
    setFormOpen(true);
    setNotice(null);
    setError(null);
  }

  async function submit() {
    if (name.trim().length < 1) {
      setError("Nama jabatan wajib diisi.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const body = {
        name: name.trim(),
        departmentId: departmentId || null,
        level: Number(level),
        active,
      };
      if (editing) {
        await apiFetch(`/api/positions/${editing.id}`, {
          method: "PATCH",
          body,
        });
      } else {
        await apiFetch("/api/positions", { method: "POST", body });
      }
      await queryClient.invalidateQueries({ queryKey: ["admin", "positions"] });
      setFormOpen(false);
      setNotice(editing ? "Jabatan diperbarui." : "Jabatan berhasil dibuat.");
      setEditing(null);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : "Jabatan gagal disimpan.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: PositionRow) {
    if (!window.confirm(`Hapus jabatan ${row.name}?`)) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/positions/${row.id}`, { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: ["admin", "positions"] });
      setNotice("Jabatan dihapus.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal menghapus.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Jabatan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kelola jabatan dan hubungkan dengan departemen.
        </p>
      </header>

      {notice && (
        <p role="status" className="rounded-lg border bg-card px-4 py-3 text-sm text-positive">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {!formOpen ? (
        <Button className="h-11 w-full" onClick={openCreate}>
          <Plus aria-hidden="true" />
          Tambah jabatan
        </Button>
      ) : (
        <section className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">
              {editing ? "Ubah jabatan" : "Jabatan baru"}
            </h2>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="grid size-10 place-items-center rounded-md border text-muted-foreground"
              aria-label="Tutup form jabatan"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1.5 text-sm">
              <Label htmlFor="position-name">Nama</Label>
              <input
                id="position-name"
                value={name}
                maxLength={120}
                onChange={(event) => setName(event.target.value)}
                className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <Label htmlFor="position-department">Departemen</Label>
              <select
                id="position-department"
                value={departmentId}
                onChange={(event) => setDepartmentId(event.target.value)}
                className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
              >
                <option value="">Tanpa departemen</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm">
              <Label htmlFor="position-level">Level (1–10)</Label>
              <input
                id="position-level"
                type="number"
                min={1}
                max={10}
                value={level}
                onChange={(event) => setLevel(event.target.value)}
                className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
              />
            </label>
            <label className="flex min-h-10 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
                className="size-4"
              />
              Jabatan aktif
            </label>
            <Button className="h-11 w-full" disabled={busy} onClick={() => void submit()}>
              {busy ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <Plus aria-hidden="true" />
              )}
              {busy ? "Menyimpan…" : "Simpan jabatan"}
            </Button>
          </div>
        </section>
      )}

      {positionsQuery.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Memuat jabatan…
        </p>
      ) : positionsQuery.error ? (
        <p role="alert" className="rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger">
          {positionsQuery.error.message}
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card px-6 py-12 text-center">
          <Briefcase className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-sm text-muted-foreground">
            Belum ada jabatan.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => openEdit(row)}
                >
                  <p className="font-medium">{row.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {departmentName(row.departmentId)} · Level {row.level}
                    {row.active ? "" : " · Nonaktif"}
                  </p>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void remove(row)}
                  className="grid size-10 shrink-0 place-items-center rounded-md border text-muted-foreground"
                  aria-label={`Hapus jabatan ${row.name}`}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
