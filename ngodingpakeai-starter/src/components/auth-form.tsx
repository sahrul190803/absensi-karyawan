"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { siteConfig } from "@/config/site";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const signingUp = mode === "sign-up";
  const router = useRouter();
  const searchParams = useSearchParams();
  const justReset = searchParams.get("reset") === "success";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const credentials = {
        email: String(data.get("email")).trim(),
        password: String(data.get("password")),
      };
      const result = signingUp
        ? await authClient.signUp.email({
            ...credentials,
            name: String(data.get("name")).trim(),
          })
        : await authClient.signIn.email(credentials);
      if (result.error) {
        setError(
          signingUp
            ? result.error.message ||
                "Akun tidak dapat dibuat. Coba lagi sebentar lagi."
            : "Email atau kata sandi salah. Periksa kembali lalu coba lagi.",
        );
        return;
      }
      router.replace(siteConfig.homePath);
      router.refresh();
    } catch {
      setError("Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <p className="mb-3 inline-flex items-center rounded-full border border-border-strong bg-primary-quiet px-2.5 py-0.5 text-xs font-semibold text-primary-text">
        {signingUp ? "Registrasi akun karyawan" : "Portal kehadiran"}
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-balance">
        {signingUp ? "Daftar akun karyawan" : "Masuk ke Hadirku Lecarassa"}
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {signingUp
          ? "Gunakan nama lengkap dan email aktif. HRD akan menghubungkan akun ini dengan data karyawan Anda."
          : "Absen dengan foto selfie, lihat jadwal shift, ajukan izin, dan klaim jatah makan."}
      </p>
      <form
        onSubmit={onSubmit}
        className="mt-8 space-y-5"
        aria-busy={pending}
        aria-describedby={error ? "auth-error" : undefined}
      >
        <fieldset disabled={pending} className="space-y-5">
          <legend className="sr-only">
            {signingUp ? "Data akun" : "Data masuk"}
          </legend>
          {signingUp && (
            <div className="space-y-2">
              <Label htmlFor="name">Nama lengkap</Label>
              <Input
                id="name"
                name="name"
                autoComplete="name"
                placeholder="Nama sesuai data karyawan"
                required
                minLength={1}
                maxLength={100}
                pattern=".*\S.*"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="nama@lecarassa.id"
              required
              maxLength={254}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Kata sandi</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={signingUp ? "new-password" : "current-password"}
              required
              minLength={8}
              maxLength={128}
              aria-describedby={signingUp ? "password-hint" : undefined}
            />
            {signingUp && (
              <p id="password-hint" className="text-sm text-muted-foreground">
                Minimal 8 karakter.
              </p>
            )}
            {!signingUp && (
              <p className="text-right">
                <Link
                  className="rounded-sm text-sm font-medium text-foreground underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
                  href="/forgot-password"
                >
                  Lupa kata sandi?
                </Link>
              </p>
            )}
          </div>
          {justReset && !signingUp && (
            <p className="rounded-lg border bg-card p-3 text-sm leading-6">
              Kata sandi berhasil diubah. Silakan masuk dengan kata sandi baru.
            </p>
          )}
          {error && (
            <p
              id="auth-error"
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm leading-6 text-danger"
            >
              {error}
            </p>
          )}
          <Button className="w-full" type="submit" size="lg" disabled={pending}>
            {pending ? (
              <LoaderCircle
                className="animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : null}
            {pending ? "Mohon tunggu…" : signingUp ? "Buat akun" : "Masuk"}
            {!pending && <ArrowRight aria-hidden="true" />}
          </Button>
        </fieldset>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {signingUp ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
        <Link
          className="rounded-sm font-medium text-foreground underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
          href={signingUp ? "/sign-in" : "/sign-up"}
        >
          {signingUp ? "Masuk" : "Daftar sekarang"}
        </Link>
      </p>
    </div>
  );
}
