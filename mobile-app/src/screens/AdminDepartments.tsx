import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  LoaderCircle,
  Plus,
  Power,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiFetch, ApiError } from "@/lib/api";
import type { DepartmentRow, EmployeeResponse } from "@/lib/admin-types";

type DepartmentResponse = { data: DepartmentRow[] };

export function AdminDepartmentsScreen() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentRow | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [managerUserId, setManagerUserId] = useState("");
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const departmentsQuery = useQuery({
    queryKey: ["admin", "departments"],
    queryFn: () =>
      apiFetch<DepartmentResponse>("/api/departments?limit=200&offset=0"),
    retry: false,
  });
  const employeesQuery = useQuery({
    queryKey: ["admin", "employees"],
    queryFn: () =>
      apiFetch<EmployeeResponse>("/api/employees?limit=200&offset=0"),
    retry: false,
  });

  const rows = departmentsQuery.data?.data ?? [];
  const employees = employeesQuery.data?.data ?? [];
  const managerName = (userId: string | null) =>
    employees.find((employee) => employee.userId === userId)?.fullName ?? "—";

  function openCreate() {
    setEditing(null);
    setName("");
    setCode("");
    setManagerUserId("");
    setActive(true);
    setFormOpen(true);
    setNotice(null);
    setError(null);
  }

  function openEdit(row: DepartmentRow) {
    setEditing(row);
    setName(row.name);
    setCode(row.code ?? "");
    setManagerUserId(row.managerUserId ?? "");
    setActive(row.active);
    setFormOpen(true);
    setNotice(null);
    setError(null);
  }

  async function submit() {
    if (name.trim().length < 1) {
      setError("Nama departemen wajib diisi.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const body = {
        name: name.trim(),
        code: code.trim() || undefined,
        managerUserId: managerUserId || null,
        active,
      };
      if (editing) {
        await apiFetch(`/api/departments/${editing.id}`, {
          method: "PATCH",
          body,
        });
      } else {
        await apiFetch("/api/departments", { method: "POST", body });
      }
      await queryClient.invalidateQueries({
        queryKey: ["admin", "departments"],
      });
      setFormOpen(false);
      setNotice(
        editing ? "Departemen diperbarui." : "Departemen berhasil dibuat.",
      );
      setEditing(null);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : "Departemen gagal disimpan.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggle(row: DepartmentRow) {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/departments/${row.id}`, {
        method: "PATCH",
        body: { active: !row.active },
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin", "departments"],
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal mengubah status.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: DepartmentRow) {
    if (!window.confirm(`Hapus departemen ${row.name}?`)) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/departments/${row.id}`, { method: "DELETE" });
      await queryClient.invalidateQueries({
        queryKey: ["admin", "departments"],
      });
      setNotice("Departemen dihapus.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal menghapus.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Departemen</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kelola divisi dan tunjuk kepala divisi (HOD).
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
          Tambah departemen
        </Button>
      ) : (
        <section className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">
              {editing ? "Ubah departemen" : "Departemen baru"}
            </h2>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="grid size-10 place-items-center rounded-md border text-muted-foreground"
              aria-label="Tutup form departemen"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1.5 text-sm">
              <Label htmlFor="department-name">Nama</Label>
              <input
                id="department-name"
                value={name}
                maxLength={120}
                onChange={(event) => setName(event.target.value)}
                className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <Label htmlFor="department-code">Kode (opsional)</Label>
              <input
                id="department-code"
                value={code}
                maxLength={20}
                onChange={(event) => setCode(event.target.value)}
                placeholder="Otomatis dari nama"
                className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <Label htmlFor="department-manager">Kepala divisi</Label>
              <select
                id="department-manager"
                value={managerUserId}
                onChange={(event) => setManagerUserId(event.target.value)}
                className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
              >
                <option value="">Belum ditunjuk</option>
                {employees.map((employee) => (
                  <option key={employee.userId} value={employee.userId}>
                    {employee.fullName} · {employee.nik}
                  </option>
                ))}
              </select>
              <span className="text-xs text-muted-foreground">
                Menunjuk kepala divisi otomatis memberi role HOD.
              </span>
            </label>
            <label className="flex min-h-10 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
                className="size-4"
              />
              Departemen aktif
            </label>
            <Button className="h-11 w-full" disabled={busy} onClick={() => void submit()}>
              {busy ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <Plus aria-hidden="true" />
              )}
              {busy ? "Menyimpan…" : "Simpan departemen"}
            </Button>
          </div>
        </section>
      )}

      {departmentsQuery.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Memuat departemen…
        </p>
      ) : departmentsQuery.error ? (
        <p role="alert" className="rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger">
          {departmentsQuery.error.message}
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card px-6 py-12 text-center">
          <Building2 className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-sm text-muted-foreground">
            Belum ada departemen.
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
                    {row.code ?? "Tanpa kode"} · Kepala: {managerName(row.managerUserId)}
                  </p>
                </button>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void toggle(row)}
                    className={`grid size-10 place-items-center rounded-md border ${
                      row.active ? "text-positive" : "text-muted-foreground"
                    }`}
                    aria-label={row.active ? "Nonaktifkan departemen" : "Aktifkan departemen"}
                  >
                    <Power className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void remove(row)}
                    className="grid size-10 place-items-center rounded-md border text-muted-foreground"
                    aria-label={`Hapus departemen ${row.name}`}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
