import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brand } from "@/components/Brand";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { openExternal } from "@/lib/external";

export function SignInScreen() {
  const { status, homePath, signIn } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  if (status === "authenticated") return <Navigate to={homePath} replace />;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      await signIn(String(data.get("email")), String(data.get("password")));
    } catch (caught) {
      const message =
        caught instanceof Error && caught.message
          ? caught.message
          : "Email atau kata sandi salah. Periksa kembali lalu coba lagi.";
      setError(
        /invalid|unauthorized|credentials/i.test(message)
          ? "Email atau kata sandi salah. Periksa kembali lalu coba lagi."
          : message,
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
            Absensi Karyawan
          </span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-12">
        <div className="w-full max-w-sm">
          <p className="mb-3 inline-flex items-center rounded-full border border-border-strong bg-primary-quiet px-2.5 py-0.5 text-xs font-semibold text-primary-text">
            Portal kehadiran
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            Masuk ke Hadirku Lecarassa
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Absen dengan foto selfie, lihat jadwal shift, ajukan izin, dan klaim
            jatah makan.
          </p>

          <form
            onSubmit={onSubmit}
            className="mt-7 space-y-5"
            aria-busy={pending}
            aria-describedby={error ? "auth-error" : undefined}
          >
            <fieldset disabled={pending} className="space-y-4">
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
                  autoComplete="current-password"
                  required
                  minLength={8}
                  maxLength={128}
                  className="h-11"
                />
                <p className="text-right">
                  <button
                    type="button"
                    onClick={() =>
                      void openExternal(`${API_URL}/forgot-password`)
                    }
                    className="rounded-sm text-sm font-medium text-foreground underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    Lupa kata sandi?
                  </button>
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
                {pending ? "Mohon tunggu…" : "Masuk"}
                {!pending && <ArrowRight aria-hidden="true" />}
              </Button>
            </fieldset>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Belum punya akun?{" "}
            <Link
              to="/sign-up"
              className="rounded-sm font-medium text-foreground underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
            >
              Daftar sekarang
            </Link>
          </p>
          <p className="mt-6 text-center text-[11px] leading-5 text-muted-foreground">
            Gunakan akun yang diberikan HRD. Hubungi HRD jika akun belum aktif
            atau lupa kata sandi.
          </p>
        </div>
      </main>
    </div>
  );
}
