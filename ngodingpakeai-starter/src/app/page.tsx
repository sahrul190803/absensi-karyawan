import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Camera,
  MapPin,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Beranda" };

const FEATURES = [
  {
    icon: Camera,
    title: "Foto selfie ber-watermark",
    body: "Waktu, lokasi, dan keterangan tempat tercetak langsung di foto absensi.",
  },
  {
    icon: MapPin,
    title: "GPS & radius kantor",
    body: "Radius tiap lokasi diatur dari peta. Marketing dan HOD bebas dinas luar.",
  },
  {
    icon: CalendarDays,
    title: "Jadwal shift mingguan",
    body: "HOD menyusun shift per minggu atau bulan, karyawan melihat jadwalnya.",
  },
  {
    icon: Wallet,
    title: "Penggajian otomatis",
    body: "Rekap hadir, terlambat, alpha, dan lembur dihitung ke gaji HRD.",
  },
  {
    icon: UtensilsCrossed,
    title: "Jatah makan harian",
    body: "Klaim makan pagi, siang, atau malam satu kali per hari.",
  },
];

export default async function Home() {
  const session = await getSession();
  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5">
        <Brand href="/" />
        {session ? (
          <Button asChild size="sm">
            <Link href={siteConfig.homePath}>
              Buka aplikasi
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/sign-in">Masuk</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/sign-up">Daftar</Link>
            </Button>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-20">
        <section className="border-b border-border py-14 sm:py-20">
          <p className="inline-flex items-center rounded-full border border-border-strong bg-primary-quiet px-3 py-1 text-xs font-semibold text-primary-text">
            {siteConfig.name}
          </p>
          <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Absensi kehadiran yang jujur, rapi, dan mudah dipakai.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
            Foto selfie tervalidasi waktu server dan lokasi, jadwal shift dari
            HOD, persetujuan izin &amp; cuti, klaim jatah makan, sampai
            perhitungan gaji — semuanya dalam satu tempat untuk tim Lecarassa.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {session ? (
              <Button asChild size="lg">
                <Link href={siteConfig.homePath}>
                  Buka aplikasi
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg">
                  <Link href="/sign-in">
                    Masuk sekarang
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/sign-up">Daftar akun karyawan</Link>
                </Button>
              </>
            )}
          </div>
        </section>

        <section className="pt-12">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Yang tersedia di dalam
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <li
                key={feature.title}
                className="rounded-lg border border-border bg-card p-5"
              >
                <feature.icon
                  className="size-5 text-primary-text"
                  aria-hidden="true"
                />
                <h3 className="mt-3 font-semibold">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                  {feature.body}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-6 py-6 text-sm text-muted-foreground">
          <span>{siteConfig.name}</span>
          <span>Waktu resmi memakai jam server (WIB).</span>
        </div>
      </footer>
    </div>
  );
}
