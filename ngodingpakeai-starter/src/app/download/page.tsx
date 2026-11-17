import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  ExternalLink,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Download APK Android",
  description:
    "Unduh APK Hadirku Lecarassa 1.2 untuk Android. Distribusi internal gratis, tanpa Play Store.",
};

const APK_URL =
  "https://github.com/sahrul190803/absensi-karyawan/releases/download/v1.2/hadirku-lecarassa-1.2.apk";
const RELEASE_URL =
  "https://github.com/sahrul190803/absensi-karyawan/releases/tag/v1.2";
const SHA256 =
  "3578D277B013080F4269A3B2C68C32C506C21632D8A88738F3021C4D1D97DADF";

const STEPS = [
  "Unduh file APK di HP Android.",
  "Buka file APK dari notifikasi atau file manager.",
  "Jika diminta, aktifkan “Install unknown apps” untuk browser/file manager yang dipakai.",
  "Install, lalu izinkan kamera dan lokasi saat pertama membuka aplikasi.",
];

export default function DownloadPage() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-5 sm:px-6">
        <Brand href="/" />
        <Button asChild variant="outline" size="sm">
          <Link href="/">
            <ArrowLeft aria-hidden="true" />
            Beranda
          </Link>
        </Button>
      </header>

      <main id="main-content" className="mx-auto max-w-3xl px-5 pb-20 sm:px-6">
        <div className="rounded-xl border bg-card p-5 sm:p-8">
          <p className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-primary-quiet px-3 py-1 text-xs font-semibold text-primary-text">
            <Smartphone className="size-3.5" aria-hidden="true" />
            Android · Distribusi internal
          </p>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
            Download Hadirku Lecarassa
          </h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            APK resmi untuk karyawan, HOD, HRD, dan Admin Lecarassa. Distribusi
            internal gratis; aplikasi belum tersedia di Play Store.
          </p>

          <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-lg border bg-background p-3">
              <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Versi
              </dt>
              <dd className="mt-1 font-medium">1.2 (versionCode 3)</dd>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Ukuran
              </dt>
              <dd className="mt-1 font-medium">±8.4 MB</dd>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Diperbarui
              </dt>
              <dd className="mt-1 font-medium">17 November 2026</dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 flex-1">
              <a href={APK_URL} target="_blank" rel="noreferrer">
                <Download aria-hidden="true" />
                Download APK
                <ExternalLink aria-hidden="true" />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12">
              <a href={RELEASE_URL} target="_blank" rel="noreferrer">
                Release notes
                <ExternalLink aria-hidden="true" />
              </a>
            </Button>
          </div>

          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            File diunduh dari GitHub Releases resmi{" "}
            <span className="font-mono">sahrul190803/absensi-karyawan</span>.
          </p>

          <section className="mt-8">
            <h2 className="text-lg font-semibold">Cara install</h2>
            <ol className="mt-3 space-y-2 text-sm leading-7 text-muted-foreground">
              {STEPS.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full border border-border-strong bg-primary-quiet text-xs font-semibold text-primary-text">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold">Verifikasi file</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              APK ditandatangani dengan release key resmi. SHA-256:
            </p>
            <code className="mt-2 block overflow-x-auto rounded-md border bg-background px-3 py-2 font-mono text-xs break-all">
              {SHA256}
            </code>
          </section>

          <section className="mt-8 rounded-lg border border-warning/40 bg-warning/5 p-4">
            <p className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
              <ShieldCheck
                className="mt-0.5 size-4 shrink-0 text-foreground"
                aria-hidden="true"
              />
              <span>
                Hanya install APK dari halaman ini atau GitHub Release resmi.
                Jangan install file dari sumber tidak dikenal. Aplikasi belum
                tersedia di Play Store atau App Store.
              </span>
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold">Catatan</h2>
            <ul className="mt-2 space-y-2 text-sm leading-7 text-muted-foreground">
              <li className="flex gap-2">
                <CheckCircle2
                  className="mt-1 size-4 shrink-0 text-positive"
                  aria-hidden="true"
                />
                Untuk update, install APK versi baru di atas aplikasi lama agar
                data tetap tersimpan.
              </li>
              <li className="flex gap-2">
                <CheckCircle2
                  className="mt-1 size-4 shrink-0 text-positive"
                  aria-hidden="true"
                />
                Akun baru perlu diverifikasi HRD sebelum bisa dipakai.
              </li>
              <li className="flex gap-2">
                <CheckCircle2
                  className="mt-1 size-4 shrink-0 text-positive"
                  aria-hidden="true"
                />
                iOS belum tersedia karena memerlukan Apple Developer Program.
              </li>
            </ul>
          </section>

          <div className="mt-8 flex flex-wrap gap-3 border-t pt-6">
            <Button asChild variant="outline">
              <Link href="/privacy">
                <ShieldCheck aria-hidden="true" />
                Kebijakan privasi
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/">
                <ArrowLeft aria-hidden="true" />
                Kembali ke beranda
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
