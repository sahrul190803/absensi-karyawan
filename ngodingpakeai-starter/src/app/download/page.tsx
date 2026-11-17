import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  ExternalLink,
  Globe,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { DevicePicker } from "./device-picker";
import { APK_SHA256, DOWNLOAD_LINKS, IOS_SHA256 } from "./links";

export const metadata: Metadata = {
  title: "Download Aplikasi",
  description:
    "Download Hadirku Lecarassa untuk Android, iPhone/iPad, atau buka aplikasi web di komputer.",
};

const ANDROID_STEPS = [
  "Unduh file APK di HP Android.",
  "Buka file APK dari notifikasi atau file manager.",
  "Jika diminta, aktifkan “Install unknown apps” untuk browser/file manager yang dipakai.",
  "Install, lalu izinkan kamera dan lokasi saat pertama membuka aplikasi.",
];

const IOS_STEPS = [
  "Unduh IPA di iPhone/iPad atau komputer.",
  "Di Windows, install iTunes/Apple Devices dan Sideloadly atau AltStore.",
  "Hubungkan iPhone dengan kabel USB, pilih Trust, lalu masukkan IPA dan Apple ID Anda.",
  "Setujui sertifikat developer di Settings → General → VPN & Device Management.",
  "Apple ID gratis berlaku sekitar 7 hari; sign ulang setelah kedaluwarsa.",
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
            Aplikasi Hadirku Lecarassa
          </p>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
            Download untuk perangkat Anda
          </h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Halaman ini mendeteksi perangkat Anda dan menampilkan opsi yang
            paling sesuai. Tersedia APK Android, IPA iOS unsigned, dan aplikasi
            web untuk komputer.
          </p>

          <div className="mt-6">
            <DevicePicker />
          </div>

          <section className="mt-8">
            <h2 className="text-lg font-semibold">Semua opsi</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col rounded-lg border bg-background p-4">
                <Smartphone className="size-5 text-primary-text" aria-hidden="true" />
                <p className="mt-3 font-semibold">Android</p>
                <p className="mt-1 flex-1 text-xs leading-5 text-muted-foreground">
                  APK release untuk HP/tablet Android. Bisa dibagikan langsung.
                </p>
                <Button asChild size="sm" className="mt-3">
                  <a href={DOWNLOAD_LINKS.apk} target="_blank" rel="noreferrer">
                    <Download aria-hidden="true" />
                    APK
                  </a>
                </Button>
              </div>

              <div className="flex flex-col rounded-lg border bg-background p-4">
                <Smartphone className="size-5 text-primary-text" aria-hidden="true" />
                <p className="mt-3 font-semibold">iPhone / iPad</p>
                <p className="mt-1 flex-1 text-xs leading-5 text-muted-foreground">
                  IPA unsigned. Perlu Sideloadly/AltStore dan Apple ID. Belum di
                  App Store.
                </p>
                <Button asChild size="sm" className="mt-3">
                  <a href={DOWNLOAD_LINKS.ios} target="_blank" rel="noreferrer">
                    <Download aria-hidden="true" />
                    IPA
                  </a>
                </Button>
              </div>

              <div className="flex flex-col rounded-lg border bg-background p-4">
                <Globe className="size-5 text-primary-text" aria-hidden="true" />
                <p className="mt-3 font-semibold">Web / Komputer</p>
                <p className="mt-1 flex-1 text-xs leading-5 text-muted-foreground">
                  Buka di browser untuk desktop HRD/Admin maupun ponsel.
                </p>
                <Button asChild size="sm" className="mt-3">
                  <a href={DOWNLOAD_LINKS.web} target="_blank" rel="noreferrer">
                    <ExternalLink aria-hidden="true" />
                    Buka web
                  </a>
                </Button>
              </div>
            </div>
          </section>

          <section id="android" className="mt-10 scroll-mt-24">
            <h2 className="text-lg font-semibold">Install Android</h2>
            <ol className="mt-3 space-y-2 text-sm leading-7 text-muted-foreground">
              {ANDROID_STEPS.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full border border-border-strong bg-primary-quiet text-xs font-semibold text-primary-text">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">
              Versi 1.2 · ±8.4 MB ·{" "}
              <a
                href={DOWNLOAD_LINKS.androidRelease}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4"
              >
                Release notes Android
              </a>
            </p>
          </section>

          <section id="ios" className="mt-10 scroll-mt-24">
            <h2 className="text-lg font-semibold">Install iOS</h2>
            <p className="mt-2 rounded-lg border border-warning/40 bg-warning/5 px-3 py-2 text-sm leading-6 text-muted-foreground">
              IPA ini <strong className="text-foreground">unsigned</strong> dan
              tidak bisa diinstall langsung. Gunakan Sideloadly atau AltStore
              dengan Apple ID Anda. Untuk TestFlight/App Store diperlukan Apple
              Developer Program berbayar.
            </p>
            <ol className="mt-3 space-y-2 text-sm leading-7 text-muted-foreground">
              {IOS_STEPS.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full border border-border-strong bg-primary-quiet text-xs font-semibold text-primary-text">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">
              Versi 1.2 · ±1.5 MB ·{" "}
              <a
                href={DOWNLOAD_LINKS.iosRelease}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4"
              >
                Catatan rilis iOS
              </a>
            </p>
          </section>

          <section id="web" className="mt-10 scroll-mt-24">
            <h2 className="text-lg font-semibold">Aplikasi web</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Untuk PC, laptop, Mac, atau browser ponsel, buka aplikasi web.
              Dashboard HRD/Admin, laporan, dan pengaturan tetap tersedia di
              browser.
            </p>
            <Button asChild variant="outline" className="mt-3">
              <a href={DOWNLOAD_LINKS.web} target="_blank" rel="noreferrer">
                <ExternalLink aria-hidden="true" />
                Buka aplikasi web
              </a>
            </Button>
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-semibold">Verifikasi file</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              File resmi ditandatangani atau dibangun dari repository ini.
              SHA-256:
            </p>
            <div className="mt-2 space-y-2">
              <div>
                <p className="text-xs font-semibold">APK Android</p>
                <code className="mt-1 block overflow-x-auto rounded-md border bg-background px-3 py-2 font-mono text-[11px] break-all">
                  {APK_SHA256}
                </code>
              </div>
              <div>
                <p className="text-xs font-semibold">IPA iOS (unsigned)</p>
                <code className="mt-1 block overflow-x-auto rounded-md border bg-background px-3 py-2 font-mono text-[11px] break-all">
                  {IOS_SHA256}
                </code>
              </div>
            </div>
          </section>

          <section className="mt-8 rounded-lg border border-warning/40 bg-warning/5 p-4">
            <p className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
              <ShieldCheck
                className="mt-0.5 size-4 shrink-0 text-foreground"
                aria-hidden="true"
              />
              <span>
                Hanya install file dari halaman ini atau GitHub Release resmi.
                Jangan install dari sumber tidak dikenal. Aplikasi belum
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
                Update Android: install APK versi baru di atas aplikasi lama
                agar data tetap tersimpan.
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
                iOS belum tersedia di App Store; distribusi dilakukan lewat IPA
                unsigned dan Sideloadly/AltStore.
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
