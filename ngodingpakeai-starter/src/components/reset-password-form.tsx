"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const linkError = searchParams.get("error") === "INVALID_TOKEN";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !token) return;
    const data = new FormData(event.currentTarget);
    const newPassword = String(data.get("password"));
    const confirm = String(data.get("confirm"));
    if (newPassword !== confirm) {
      setError("Kata sandi tidak cocok dengan konfirmasi.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const { error: resultError } = await authClient.resetPassword({
        newPassword,
        token,
      });
      if (resultError) {
        setError(
          resultError.message ||
            "Tautan tidak valid atau sudah kedaluwarsa. Minta tautan baru.",
        );
        return;
      }
      router.replace(
        "/sign-in?reset=success",
      );
    } catch {
      setError("Tidak dapat menghubungi server. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <p className="mb-3 text-sm font-medium text-primary">Langkah terakhir</p>
      <h1 className="text-3xl font-semibold tracking-tight">Kata sandi baru</h1>
      <p className="mt-3 text-base leading-7 text-muted-foreground">
        Gunakan minimal 8 karakter.
      </p>

      {linkError || !token ? (
        <div className="mt-8 space-y-5">
          <p
            role="alert"
            className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm leading-6 text-danger"
          >
            Tautan tidak valid atau sudah kedaluwarsa.
          </p>
          <Link
            href="/forgot-password"
            className="rounded-sm text-sm font-medium text-foreground underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
          >
            Minta tautan baru
          </Link>
        </div>
      ) : (
        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-5"
          aria-busy={pending}
          aria-describedby={error ? "reset-error" : undefined}
        >
          <fieldset disabled={pending} className="space-y-5">
            <legend className="sr-only">Kata sandi baru</legend>
            <div className="space-y-2">
              <Label htmlFor="password">Kata sandi baru</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Ulangi kata sandi</Label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
              />
            </div>
            {error && (
              <p
                id="reset-error"
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
              {pending ? "Menyimpan…" : "Simpan kata sandi"}
              {!pending && <ArrowRight aria-hidden="true" />}
            </Button>
          </fieldset>
        </form>
      )}
    </div>
  );
}
