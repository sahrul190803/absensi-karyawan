"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Camera, LoaderCircle, ScanFace } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Profile = {
  id: string;
  nik: string;
  fullName: string;
  phone: string;
  address: string;
  bankName: string;
  bankAccount: string;
  ktpNumber: string;
  photoUrl: string | null;
  ktpPhotoUrl: string | null;
  joinDate: string | null;
  employmentStatus: string;
  departmentName: string | null;
  positionName: string | null;
  locationName: string | null;
};

type LeaveBalance = {
  id: string;
  leaveTypeName: string;
  year: number;
  openingBalance: number;
  used: number;
  remaining: number;
};

type Device = {
  id: string;
  os: string;
  model: string;
  browser: string;
  trusted: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

type FaceStatus = {
  enabled: boolean;
  providerConfigured: boolean;
  enrolled: boolean;
  consentAt: string | null;
  similarityThreshold: number;
  livenessRequired: boolean;
};

const statusLabels: Record<string, string> = {
  active: "Aktif",
  inactive: "Nonaktif",
  resigned: "Resign",
};

const formatDate = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export function ProfileView({
  userName,
  userEmail,
}: {
  userName: string;
  userEmail: string;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordPending, setPasswordPending] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [deviceBusy, setDeviceBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({
    phone: "",
    address: "",
    bankName: "",
    bankAccount: "",
    ktpNumber: "",
  });
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [ktpData, setKtpData] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [ktpName, setKtpName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [face, setFace] = useState<FaceStatus | null>(null);
  const [faceBusy, setFaceBusy] = useState(false);
  const [faceError, setFaceError] = useState<string | null>(null);
  const [faceNotice, setFaceNotice] = useState<string | null>(null);
  const [faceCameraOpen, setFaceCameraOpen] = useState(false);
  const [facePhoto, setFacePhoto] = useState<string | null>(null);
  const [faceConsent, setFaceConsent] = useState(false);
  const faceVideoRef = useRef<HTMLVideoElement | null>(null);
  const faceStreamRef = useRef<MediaStream | null>(null);

  async function onRevokeDevice(id: string) {
    if (deviceBusy) return;
    setDeviceBusy(true);
    try {
      const response = await fetch(`/api/devices/${id}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Gagal mencabut perangkat.");
        return;
      }
      setDevices((current) => current.filter((device) => device.id !== id));
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setDeviceBusy(false);
    }
  }

  async function onChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passwordPending) return;
    const data = new FormData(event.currentTarget);
    const newPassword = String(data.get("newPassword"));
    const confirm = String(data.get("confirmPassword"));
    setPasswordError(null);
    setPasswordMessage(null);
    if (newPassword !== confirm) {
      setPasswordError("Kata sandi baru tidak cocok dengan konfirmasi.");
      return;
    }
    setPasswordPending(true);
    try {
      const { error: resultError } = await authClient.changePassword({
        currentPassword: String(data.get("currentPassword")),
        newPassword,
        revokeOtherSessions: true,
      });
      if (resultError) {
        setPasswordError(
          resultError.message ||
            "Gagal mengganti kata sandi. Periksa kata sandi saat ini.",
        );
        return;
      }
      event.currentTarget.reset();
      setPasswordMessage("Kata sandi berhasil diganti.");
    } catch {
      setPasswordError("Tidak dapat menghubungi server. Coba lagi.");
    } finally {
      setPasswordPending(false);
    }
  }

  const load = useCallback(async () => {
    try {
      const [profileResponse, balanceResponse, deviceResponse, faceResponse] =
        await Promise.all([
          fetch("/api/profile", { cache: "no-store" }),
          fetch("/api/leave-balances", { cache: "no-store" }),
          fetch("/api/devices", { cache: "no-store" }),
          fetch("/api/face/enrollment", { cache: "no-store" }),
        ]);
      const body = await profileResponse.json();
      if (!profileResponse.ok) {
        setError(body?.error?.message ?? "Gagal memuat profil.");
        return;
      }
      setProfile(body.data);
      if (balanceResponse.ok) {
        const balanceBody = await balanceResponse.json();
        setBalances(balanceBody.data ?? []);
      }
      if (deviceResponse.ok) {
        const deviceBody = await deviceResponse.json();
        setDevices(deviceBody.data ?? []);
      }
      if (faceResponse.ok) {
        const faceBody = await faceResponse.json();
        setFace(faceBody.data ?? null);
      }
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

  const openEdit = () => {
    if (!profile) return;
    setProfileForm({
      phone: profile.phone ?? "",
      address: profile.address ?? "",
      bankName: profile.bankName ?? "",
      bankAccount: profile.bankAccount ?? "",
      ktpNumber: profile.ktpNumber ?? "",
    });
    setPhotoData(null);
    setKtpData(null);
    setPhotoName("");
    setKtpName("");
    setProfileError(null);
    setProfileNotice(null);
    setEditing(true);
  };

  const pickDocument = (file: File | null, kind: "photo" | "ktp") => {
    setProfileError(null);
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setProfileError("Foto harus berformat JPG, PNG, atau WEBP.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setProfileError("Ukuran foto maksimal 3 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (!result) return;
      if (kind === "photo") {
        setPhotoData(result);
        setPhotoName(file.name);
      } else {
        setKtpData(result);
        setKtpName(file.name);
      }
    };
    reader.onerror = () => setProfileError("Gagal membaca berkas foto.");
    reader.readAsDataURL(file);
  };

  const onSaveProfile = async () => {
    if (savingProfile) return;
    setSavingProfile(true);
    setProfileError(null);
    setProfileNotice(null);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: profileForm.phone,
          address: profileForm.address,
          bankName: profileForm.bankName,
          bankAccount: profileForm.bankAccount,
          ktpNumber: profileForm.ktpNumber,
          ...(photoData ? { photo: photoData } : {}),
          ...(ktpData ? { ktpPhoto: ktpData } : {}),
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setProfileError(
          body?.error?.details?.[0]?.message ??
            body?.error?.message ??
            "Data diri gagal disimpan.",
        );
        return;
      }
      setProfile(body.data);
      setEditing(false);
      setPhotoData(null);
      setKtpData(null);
      setPhotoName("");
      setKtpName("");
      setProfileNotice(
        "Data diri tersimpan. HRD dapat melihat pembaruan ini.",
      );
    } catch {
      setProfileError("Tidak dapat menghubungi server.");
    } finally {
      setSavingProfile(false);
    }
  };

  const stopFaceCamera = useCallback(() => {
    faceStreamRef.current?.getTracks().forEach((track) => track.stop());
    faceStreamRef.current = null;
    if (faceVideoRef.current) faceVideoRef.current.srcObject = null;
  }, []);

  useEffect(() => stopFaceCamera, [stopFaceCamera]);

  const openFaceCamera = async () => {
    setFaceError(null);
    setFaceNotice(null);
    setFacePhoto(null);
    setFaceConsent(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 } },
        audio: false,
      });
      faceStreamRef.current = stream;
      setFaceCameraOpen(true);
    } catch (caught) {
      let reason = "Kamera tidak dapat diakses.";
      if (caught instanceof Error) {
        if (caught.name === "NotAllowedError") {
          reason =
            "Izin kamera ditolak. Aktifkan kamera untuk mendaftarkan wajah.";
        } else if (caught.message) {
          reason = caught.message;
        }
      }
      setFaceError(reason);
    }
  };

  useEffect(() => {
    if (faceCameraOpen && faceVideoRef.current && faceStreamRef.current) {
      faceVideoRef.current.srcObject = faceStreamRef.current;
      void faceVideoRef.current.play();
    }
  }, [faceCameraOpen]);

  const captureFacePhoto = () => {
    const video = faceVideoRef.current;
    if (!video) return;
    const maxWidth = 640;
    const scale = Math.min(1, maxWidth / (video.videoWidth || maxWidth));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round((video.videoWidth || maxWidth) * scale);
    canvas.height = Math.round((video.videoHeight || maxWidth) * scale);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setFacePhoto(canvas.toDataURL("image/jpeg", 0.8));
  };

  const closeFaceCamera = () => {
    stopFaceCamera();
    setFaceCameraOpen(false);
    setFacePhoto(null);
    setFaceConsent(false);
  };

  const submitFace = async () => {
    if (!facePhoto || !faceConsent || faceBusy) return;
    setFaceBusy(true);
    setFaceError(null);
    try {
      const response = await fetch("/api/face/enrollment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo: facePhoto, consent: true }),
      });
      const body = await response.json();
      if (!response.ok) {
        setFaceError(
          body?.error?.details?.[0]?.message ??
            body?.error?.message ??
            "Pendaftaran wajah gagal disimpan.",
        );
        return;
      }
      setFace(body.data);
      closeFaceCamera();
      setFaceNotice(
        "Wajah terdaftar. Verifikasi wajah akan dipakai saat Anda absen.",
      );
    } catch {
      setFaceError("Tidak dapat menghubungi server.");
    } finally {
      setFaceBusy(false);
    }
  };

  const revokeFaceData = async () => {
    if (faceBusy) return;
    if (
      !window.confirm(
        "Cabut data wajah? Absen dengan verifikasi wajah tidak akan berlaku sampai Anda mendaftar ulang.",
      )
    )
      return;
    setFaceBusy(true);
    setFaceError(null);
    setFaceNotice(null);
    try {
      const response = await fetch("/api/face/enrollment", {
        method: "DELETE",
      });
      const body = await response.json();
      if (!response.ok) {
        setFaceError(body?.error?.message ?? "Gagal mencabut data wajah.");
        return;
      }
      setFace(body.data);
      setFaceNotice("Data wajah dicabut.");
    } catch {
      setFaceError("Tidak dapat menghubungi server.");
    } finally {
      setFaceBusy(false);
    }
  };

  const displayRows: { label: string; value: string }[] = profile
    ? [
        { label: "NIK", value: profile.nik },
        { label: "Telepon", value: profile.phone || "—" },
        { label: "Alamat lengkap / domisili", value: profile.address || "—" },
        { label: "Bank", value: profile.bankName || "—" },
        { label: "No. rekening", value: profile.bankAccount || "—" },
        { label: "No. KTP", value: profile.ktpNumber || "—" },
        { label: "Departemen", value: profile.departmentName ?? "—" },
        { label: "Jabatan", value: profile.positionName ?? "—" },
        { label: "Lokasi kerja", value: profile.locationName ?? "—" },
        { label: "Bergabung", value: formatDate(profile.joinDate) },
        {
          label: "Status",
          value:
            statusLabels[profile.employmentStatus] ?? profile.employmentStatus,
        },
      ]
    : [];

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Profil
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Data akun dan kepegawaianmu
      </p>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <section className="mt-6 flex items-center gap-4 rounded-lg border border-border-strong bg-card p-5">
        <span className="grid size-12 flex-none place-items-center overflow-hidden rounded-full border border-border-strong bg-primary-quiet font-semibold">
          {profile?.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/employees/${profile.id}/documents/photo`}
              alt={`Foto profil ${profile.fullName}`}
              className="size-full object-cover"
            />
          ) : (
            (profile?.fullName ?? userName)
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase())
              .join("")
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">
            {profile?.fullName ?? userName}
          </p>
          <p className="truncate text-sm text-muted-foreground">{userEmail}</p>
        </div>
      </section>

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Memuat profil…</p>
      ) : profile ? (
        <>
          <section className="mt-8" aria-labelledby="datadiri-title">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="datadiri-title" className="text-lg font-semibold">
                Data diri
              </h2>
              {!editing && (
                <Button variant="outline" size="sm" onClick={openEdit}>
                  Ubah data
                </Button>
              )}
            </div>

            {profileNotice && (
              <p
                role="status"
                className="mt-3 rounded-lg border bg-card px-4 py-3 text-sm"
              >
                {profileNotice}
              </p>
            )}
            {profileError && (
              <p
                role="alert"
                className="mt-3 rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger"
              >
                {profileError}
              </p>
            )}

            {!editing ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <figure className="rounded-lg border bg-card p-3">
                  <figcaption className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Foto profil
                  </figcaption>
                  {profile.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/employees/${profile.id}/documents/photo`}
                      alt={`Foto profil ${profile.fullName}`}
                      className="mt-2 h-36 w-full rounded-md border border-border object-cover"
                    />
                  ) : (
                    <p className="mt-2 flex h-36 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                      Belum diunggah
                    </p>
                  )}
                </figure>
                <figure className="rounded-lg border bg-card p-3">
                  <figcaption className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Foto KTP
                  </figcaption>
                  {profile.ktpPhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/employees/${profile.id}/documents/ktp`}
                      alt={`Foto KTP ${profile.fullName}`}
                      className="mt-2 h-36 w-full rounded-md border border-border object-cover"
                    />
                  ) : (
                    <p className="mt-2 flex h-36 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                      Belum diunggah
                    </p>
                  )}
                </figure>
              </div>
            ) : (
              <div className="mt-3 grid gap-3 rounded-lg border bg-card p-5">
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">Telepon</span>
                  <input
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                    value={profileForm.phone}
                    onChange={(event) =>
                      setProfileForm({ ...profileForm, phone: event.target.value })
                    }
                  />
                </label>
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">Alamat lengkap / domisili</span>
                  <textarea
                    rows={3}
                    className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                    value={profileForm.address}
                    onChange={(event) =>
                      setProfileForm({
                        ...profileForm,
                        address: event.target.value,
                      })
                    }
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium">Nama bank</span>
                    <input
                      className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                      placeholder="BCA / Mandiri / BNI…"
                      value={profileForm.bankName}
                      onChange={(event) =>
                        setProfileForm({
                          ...profileForm,
                          bankName: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium">Nomor rekening</span>
                    <input
                      className="h-10 w-full rounded-md border border-border bg-card px-3 font-mono text-sm"
                      value={profileForm.bankAccount}
                      onChange={(event) =>
                        setProfileForm({
                          ...profileForm,
                          bankAccount: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">Nomor KTP</span>
                  <input
                    className="h-10 w-full rounded-md border border-border bg-card px-3 font-mono text-sm"
                    value={profileForm.ktpNumber}
                    onChange={(event) =>
                      setProfileForm({
                        ...profileForm,
                        ktpNumber: event.target.value,
                      })
                    }
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium">
                      Foto profil (JPG/PNG/WEBP, maks 3 MB)
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-sm"
                      onChange={(event) =>
                        pickDocument(event.target.files?.[0] ?? null, "photo")
                      }
                    />
                    {photoName && (
                      <span className="text-xs text-muted-foreground">
                        Dipilih: {photoName}
                      </span>
                    )}
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium">
                      Foto KTP (JPG/PNG/WEBP, maks 3 MB)
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-sm"
                      onChange={(event) =>
                        pickDocument(event.target.files?.[0] ?? null, "ktp")
                      }
                    />
                    {ktpName && (
                      <span className="text-xs text-muted-foreground">
                        Dipilih: {ktpName}
                      </span>
                    )}
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={savingProfile}
                    onClick={() => void onSaveProfile()}
                  >
                    {savingProfile ? "Menyimpan…" : "Simpan data diri"}
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={savingProfile}
                    onClick={() => {
                      setEditing(false);
                      setProfileError(null);
                      setPhotoData(null);
                      setKtpData(null);
                      setPhotoName("");
                      setKtpName("");
                    }}
                  >
                    Batal
                  </Button>
                </div>
              </div>
            )}
          </section>

          <h2 className="mt-8 text-lg font-semibold">Data kepegawaian</h2>
          <dl className="mt-3 grid gap-px overflow-hidden rounded-lg border bg-card">
            {displayRows.map((row) => (
              <div
                key={row.label}
                className="flex items-start justify-between gap-4 border-b px-5 py-3 text-sm last:border-b-0"
              >
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className="text-right font-medium">{row.value}</dd>
              </div>
            ))}
          </dl>

          <h2 className="mt-8 text-lg font-semibold">Saldo cuti</h2>
          {balances.length === 0 ? (
            <p className="mt-3 rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
              Belum ada saldo cuti untuk tahun ini.
            </p>
          ) : (
            <ul className="mt-3 grid gap-3">
              {balances.map((balance) => (
                <li
                  key={balance.id}
                  className="flex items-center justify-between rounded-lg border bg-card p-4"
                >
                  <div>
                    <p className="font-medium">{balance.leaveTypeName}</p>
                    <p className="text-xs text-muted-foreground">
                      Tahun {balance.year} · kuota {balance.openingBalance} hari
                      · terpakai {balance.used} hari
                    </p>
                  </div>
                  <p className="font-mono text-lg font-medium">
                    {balance.remaining}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      hari
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          )}

          <h2 className="mt-8 text-lg font-semibold">Perangkat</h2>
          {devices.length === 0 ? (
            <p className="mt-3 rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
              Belum ada perangkat tercatat. Perangkat akan tercatat otomatis
              saat kamu absen.
            </p>
          ) : (
            <ul className="mt-3 grid gap-3">
              {devices.map((device) => (
                <li
                  key={device.id}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4"
                >
                  <div>
                    <p className="font-medium">
                      {device.model} · {device.os}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Browser {device.browser}
                      {device.lastLoginAt
                        ? ` · terakhir ${new Date(device.lastLoginAt).toLocaleString("id-ID")}`
                        : ""}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={deviceBusy}
                    onClick={() => void onRevokeDevice(device.id)}
                  >
                    Cabut
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {face && (face.enabled || face.enrolled) && (
            <section aria-labelledby="wajah-title">
              <h2 id="wajah-title" className="mt-8 text-lg font-semibold">
                Verifikasi wajah
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {face.enabled
                  ? "Perusahaan mewajibkan verifikasi wajah saat absen. Daftarkan wajah Anda di sini."
                  : "Verifikasi wajah sedang tidak diwajibkan, tetapi data wajah Anda tersimpan dan bisa dicabut kapan saja."}
              </p>

              {faceNotice && (
                <p
                  role="status"
                  className="mt-3 rounded-lg border bg-card px-4 py-3 text-sm"
                >
                  {faceNotice}
                </p>
              )}
              {faceError && (
                <p
                  role="alert"
                  className="mt-3 rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger"
                >
                  {faceError}
                </p>
              )}
              {face.enabled && !face.providerConfigured && (
                <p
                  role="alert"
                  className="mt-3 rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger"
                >
                  Layanan verifikasi wajah belum siap di server. Hubungi HRD
                  sebelum mendaftar.
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
                <div className="flex items-center gap-3">
                  <ScanFace
                    className="size-8 text-primary-text"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-medium">
                      {face.enrolled ? "Wajah terdaftar" : "Belum terdaftar"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {face.enrolled && face.consentAt
                        ? `Persetujuan diberikan ${new Date(face.consentAt).toLocaleString("id-ID")}`
                        : "Foto referensi dipakai untuk mencocokkan selfie saat absen."}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {face.enabled && face.providerConfigured && (
                    <Button
                      variant={face.enrolled ? "outline" : "default"}
                      size="sm"
                      disabled={faceBusy}
                      onClick={() => void openFaceCamera()}
                    >
                      <Camera aria-hidden="true" />
                      {face.enrolled ? "Daftarkan ulang" : "Daftarkan wajah"}
                    </Button>
                  )}
                  {face.enrolled && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={faceBusy}
                      onClick={() => void revokeFaceData()}
                    >
                      Cabut data wajah
                    </Button>
                  )}
                </div>
              </div>
            </section>
          )}

          <h2 className="mt-8 text-lg font-semibold">Ganti kata sandi</h2>
          <form
            onSubmit={onChangePassword}
            className="mt-3 space-y-4 rounded-lg border bg-card p-5"
            aria-busy={passwordPending}
          >
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Kata sandi saat ini</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                minLength={8}
                maxLength={128}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Kata sandi baru</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Ulangi kata sandi baru</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
              />
            </div>
            {passwordError && (
              <p
                role="alert"
                className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm leading-6 text-danger"
              >
                {passwordError}
              </p>
            )}
            {passwordMessage && (
              <p className="rounded-lg border bg-card px-3 py-3 text-sm leading-6">
                {passwordMessage}
              </p>
            )}
            <Button type="submit" disabled={passwordPending}>
              {passwordPending ? (
                <LoaderCircle
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : null}
              {passwordPending ? "Menyimpan…" : "Simpan"}
            </Button>
          </form>
        </>
      ) : (
        <p className="mt-4 rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
          Akun ini belum terhubung ke data karyawan. Hubungi HRD untuk
          melengkapi.
        </p>
      )}

      {faceCameraOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Daftarkan wajah"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
        >
          <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-lg border bg-card p-5">
            <h2 className="text-lg font-semibold">Daftarkan wajah</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Hadapkan wajah langsung ke kamera dengan pencahayaan cukup.
              Pastikan hanya satu wajah di dalam bingkai.
            </p>

            <div className="mt-4 overflow-hidden rounded-md border bg-muted">
              {facePhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={facePhoto}
                  alt="Pratinjau foto wajah"
                  className="aspect-[3/4] w-full object-cover"
                />
              ) : (
                <video
                  ref={faceVideoRef}
                  playsInline
                  muted
                  className="aspect-[3/4] w-full object-cover"
                />
              )}
            </div>

            <label className="mt-3 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-current"
                checked={faceConsent}
                onChange={(event) => setFaceConsent(event.target.checked)}
              />
              <span>
                Saya setuju foto wajah saya disimpan dan dipakai hanya untuk
                verifikasi absensi. Saya dapat mencabutnya kapan saja dari
                halaman Profil.
              </span>
            </label>

            <div className="mt-4 flex flex-wrap gap-2">
              {!facePhoto ? (
                <Button
                  className="flex-1"
                  disabled={faceBusy}
                  onClick={captureFacePhoto}
                >
                  <Camera aria-hidden="true" />
                  Ambil Foto
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={faceBusy}
                    onClick={() => setFacePhoto(null)}
                  >
                    Ulangi
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={faceBusy || !faceConsent}
                    onClick={() => void submitFace()}
                  >
                    {faceBusy ? "Mengirim…" : "Simpan Wajah"}
                  </Button>
                </>
              )}
            </div>
            <Button
              variant="ghost"
              className="mt-2 w-full"
              disabled={faceBusy}
              onClick={closeFaceCamera}
            >
              Batal
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
