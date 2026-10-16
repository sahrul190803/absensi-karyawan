"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const { error: resultError } = await authClient.requestPasswordReset({
        email: String(data.get("email")).trim(),
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resultError) {
        setError(
          resultError.message ||
            "Gagal mengirim email atur ulang. Coba lagi nanti.",
        );
        return;
      }
      setSent(true);
    } catch {
      setError("Tidak dapat menghubungi server. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <p className="mb-3 text-sm font-medium text-primary">Atur ulang akses</p>
      <h1 className="text-3xl font-semibold tracking-tight">
        Lupa kata sandi?
      </h1>
      <p className="mt-3 text-base leading-7 text-muted-foreground">
        Masukkan email akunmu, kami kirim tautan untuk mengatur ulang kata
        sandi.
      </p>

      {sent ? (
        <div className="mt-8 space-y-5">
          <p className="rounded-lg border bg-card px-4 py-3 text-sm leading-6">
            Jika email terdaftar, tautan atur ulang telah dikirim. Periksa
            kotak masuk dan folder spam — tautan berlaku 1 jam.
          </p>
          <Link
            href="/sign-in"
            className="flex items-center gap-2 rounded-sm text-sm font-medium text-foreground underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Kembali ke masuk
          </Link>
        </div>
      ) : (
        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-5"
          aria-busy={pending}
          aria-describedby={error ? "forgot-error" : undefined}
        >
          <fieldset disabled={pending} className="space-y-5">
            <legend className="sr-only">Email akun</legend>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                maxLength={254}
              />
            </div>
            {error && (
              <p
                id="forgot-error"
                role="alert"
                className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm leading-6 text-danger"
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
              {pending ? "Mengirim…" : "Kirim tautan"}
              {!pending && <ArrowRight aria-hidden="true" />}
            </Button>
          </fieldset>
        </form>
      )}
      {!sent && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Ingat kata sandimu?{" "}
          <Link
            className="rounded-sm font-medium text-foreground underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
            href="/sign-in"
          >
            Masuk
          </Link>
        </p>
      )}
    </div>
  );
}
