import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brand } from "@/components/Brand";
import { useAuth } from "@/lib/auth";

export function SignUpScreen() {
  const { status, homePath, signUp } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  if (status === "authenticated" && !submitted)
    return <Navigate to={homePath} replace />;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const result = await signUp({
        fullName: String(data.get("name")),
        nik: String(data.get("nik")),
        phone: String(data.get("phone")),
        address: String(data.get("address")),
        email: String(data.get("email")),
        password: String(data.get("password")),
      });
      setSubmitted(true);
      navigate("/pending", {
        replace: true,
        state: { onboardingError: result.onboardingError },
      });
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message
          ? caught.message
          : "Akun tidak dapat dibuat. Coba lagi sebentar lagi.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-app flex-col bg-background">
      <header className="px-5 pt-safe">
        <div className="flex items-center justify-between py-4">
          <Brand href="/sign-in" />
          <span className="rounded-md border border-border bg-card px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
            Registrasi
          </span>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-5 pt-4 pb-12">
        <div className="w-full max-w-md">
          <p className="mb-3 inline-flex items-center rounded-full border border-border-strong bg-primary-quiet px-2.5 py-0.5 text-xs font-semibold text-primary-text">
            Registrasi akun karyawan
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            Daftar akun karyawan
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Isi data pribadi Anda. Data otomatis masuk ke daftar karyawan dan
            menunggu verifikasi HRD/HOD sebelum akun bisa dipakai.
          </p>

          <form
            onSubmit={onSubmit}
            className="mt-6 space-y-4"
            aria-busy={pending}
            aria-describedby={error ? "auth-error" : undefined}
          >
            <fieldset disabled={pending} className="space-y-4">
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
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nik">NIK</Label>
                <Input
                  id="nik"
                  name="nik"
                  placeholder="Nomor induk karyawan"
                  required
                  minLength={1}
                  maxLength={32}
                  className="h-11"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">No. telepon</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="08xxxxxxxxxx"
                    required
                    maxLength={32}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Alamat</Label>
                  <Input
                    id="address"
                    name="address"
                    autoComplete="street-address"
                    placeholder="Kota / alamat domisili"
                    maxLength={500}
                    className="h-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="nama@lecarassa.id"
                  required
                  maxLength={254}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Kata sandi</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={128}
                  className="h-11"
                />
                <p className="text-sm text-muted-foreground">
                  Minimal 8 karakter.
                </p>
              </div>

              {error && (
                <p
                  id="auth-error"
                  role="alert"
                  className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm leading-6 text-danger"
                >
                  {error}
                </p>
              )}

              <Button
                className="h-11 w-full"
                type="submit"
                size="lg"
                disabled={pending}
              >
                {pending ? (
                  <LoaderCircle
                    className="animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                ) : null}
                {pending ? "Membuat akun…" : "Buat akun"}
                {!pending && <ArrowRight aria-hidden="true" />}
              </Button>
            </fieldset>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Sudah punya akun?{" "}
            <Link
              to="/sign-in"
              className="rounded-sm font-medium text-foreground underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
            >
              Masuk
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
