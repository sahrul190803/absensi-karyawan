import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Clock3, LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/Brand";
import { useAuth } from "@/lib/auth";
import { apiFetch, ApiError } from "@/lib/api";

type PendingState = { onboardingError?: string | null } | null;

export function PendingScreen() {
  const { status, user, homePath, signOut, refreshSession } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");
  const onboardingError = (location.state as PendingState)?.onboardingError;

  if (status === "unauthenticated") return <Navigate to="/sign-in" replace />;

  async function checkStatus() {
    setChecking(true);
    setMessage("");
    try {
      await apiFetch("/api/profile");
      await refreshSession();
      navigate(homePath, { replace: true });
    } catch (caught) {
      if (caught instanceof ApiError) {
        if (caught.code === "ACCOUNT_PENDING") {
          setMessage(
            "Akun masih menunggu verifikasi HRD. Coba lagi nanti atau hubungi HRD.",
          );
        } else if (caught.code === "ACCOUNT_NOT_LINKED") {
          setMessage(
            "Data pribadi belum tersimpan. Silakan daftar ulang atau hubungi HRD.",
          );
        } else {
          setMessage(caught.message);
        }
      } else {
        setMessage("Tidak dapat memeriksa status akun. Periksa koneksi.");
      }
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="flex min-h-app flex-col bg-background">
      <header className="px-5 pt-safe">
        <div className="flex items-center justify-between py-4">
          <Brand href="/pending" />
          <span className="rounded-md border border-border bg-card px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
            Menunggu
          </span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-12">
        <div className="w-full max-w-sm">
          <span className="grid size-12 place-items-center rounded-xl border border-border-strong bg-primary-quiet text-primary-text">
            <Clock3 className="size-6" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight">
            Akun menunggu verifikasi
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Halo <span className="font-semibold text-foreground">{user?.name}</span>
            , akun Anda sudah dibuat. HRD/HOD perlu memverifikasi data karyawan
            sebelum Anda bisa absen dan memakai fitur lainnya.
          </p>

          {onboardingError && (
            <p className="mt-4 rounded-lg border border-warning/40 bg-warning-quiet p-3 text-sm leading-6 text-warning">
              Data pribadi belum tersimpan: {onboardingError}
            </p>
          )}
          {message && (
            <p
              role="status"
              className="mt-4 rounded-lg border border-border bg-card p-3 text-sm leading-6 text-muted-foreground"
            >
              {message}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-2">
            <Button
              size="lg"
              className="h-11 w-full"
              disabled={checking}
              onClick={() => void checkStatus()}
            >
              {checking ? (
                <LoaderCircle
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <RefreshCw aria-hidden="true" />
              )}
              {checking ? "Memeriksa…" : "Muat ulang status"}
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-11 w-full"
            >
              <a href="mailto:hrd@lecarassa.id">Hubungi HRD</a>
            </Button>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link
              to="/sign-in"
              onClick={(event) => {
                event.preventDefault();
                void signOut().then(() => navigate("/sign-in", { replace: true }));
              }}
              className="font-medium text-foreground underline underline-offset-4"
            >
              Keluar dan masuk dengan akun lain
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
