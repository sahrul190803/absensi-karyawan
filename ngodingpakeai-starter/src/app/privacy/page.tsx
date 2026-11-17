import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import {
  privacyConfig,
  privacyHasPlaceholders,
} from "@/config/privacy";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description:
    "Kebijakan privasi aplikasi Hadirku Lecarassa: data yang dikumpulkan, tujuan pemrosesan, keamanan, dan hak pengguna.",
};

const SECTIONS = [
  { id: "pengendali", label: "Pengendali data" },
  { id: "data", label: "Data yang dikumpulkan" },
  { id: "penggunaan", label: "Cara kami menggunakan data" },
  { id: "izin", label: "Izin perangkat" },
  { id: "keamanan", label: "Penyimpanan dan keamanan" },
  { id: "berbagi", label: "Berbagi dengan pihak lain" },
  { id: "retensi", label: "Retensi data" },
  { id: "hak", label: "Hak pengguna" },
  { id: "hapus-akun", label: "Penghapusan akun" },
  { id: "anak", label: "Anak-anak" },
  { id: "perubahan", label: "Perubahan kebijakan" },
  { id: "kontak", label: "Kontak" },
] as const;

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default function PrivacyPage() {
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

      <main id="main-content" className="mx-auto max-w-5xl px-5 pb-20 sm:px-6">
        <div className="rounded-xl border bg-card p-5 sm:p-8">
          <p className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-primary-quiet px-3 py-1 text-xs font-semibold text-primary-text">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Kebijakan Privasi
          </p>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
            Kebijakan Privasi {privacyConfig.appName}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            Kebijakan ini menjelaskan bagaimana {privacyConfig.companyName}{" "}
            mengumpulkan, menggunakan, menyimpan, dan melindungi data pribadi
            pengguna aplikasi {privacyConfig.appName}.
          </p>

          <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-lg border bg-background p-3">
              <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Perusahaan
              </dt>
              <dd className="mt-1 font-medium">{privacyConfig.companyName}</dd>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Berlaku sejak
              </dt>
              <dd className="mt-1 font-medium">{privacyConfig.effectiveDate}</dd>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Terakhir diperbarui
              </dt>
              <dd className="mt-1 font-medium">{privacyConfig.updatedDate}</dd>
            </div>
          </dl>

          {privacyHasPlaceholders && (
            <p
              role="note"
              className="mt-5 rounded-lg border border-warning/40 bg-warning/5 px-4 py-3 text-sm leading-6 text-muted-foreground"
            >
              Informasi kontak privasi sedang dilengkapi. Sementara itu,
              pertanyaan tentang data karyawan dapat disampaikan melalui
              HRD/Admin perusahaan.
            </p>
          )}

          <nav aria-label="Daftar isi" className="mt-8 rounded-lg border bg-background p-4">
            <p className="text-sm font-semibold">Daftar isi</p>
            <ol className="mt-2 grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
              {SECTIONS.map((section, index) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="underline-offset-4 hover:text-foreground hover:underline"
                  >
                    {index + 1}. {section.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="mt-8 space-y-8">
            <Section id="pengendali" title="1. Pengendali data">
              <p>
                Aplikasi {privacyConfig.appName} dikelola oleh{" "}
                <strong className="text-foreground">
                  {privacyConfig.companyName}
                </strong>
                . Data kepegawaian pengguna dikendalikan oleh perusahaan tempat
                pengguna bekerja.
              </p>
              <div className="grid gap-2 rounded-lg border bg-background p-4 sm:grid-cols-2">
                <p className="flex items-start gap-2">
                  <MapPin className="mt-1 size-4 shrink-0" aria-hidden="true" />
                  <span>{privacyConfig.address}</span>
                </p>
                <p className="flex items-start gap-2">
                  <Mail className="mt-1 size-4 shrink-0" aria-hidden="true" />
                  <span>{privacyConfig.email}</span>
                </p>
                <p className="flex items-start gap-2">
                  <Phone className="mt-1 size-4 shrink-0" aria-hidden="true" />
                  <span>{privacyConfig.phone}</span>
                </p>
              </div>
            </Section>

            <Section id="data" title="2. Data yang kami kumpulkan">
              <h3 className="font-semibold text-foreground">
                a. Data akun dan identitas
              </h3>
              <Bullets
                items={[
                  "Nama lengkap, email, nomor telepon, dan alamat.",
                  "NIK, nomor KTP, dan foto KTP jika diisi perusahaan.",
                  "Departemen, jabatan, lokasi kerja, tanggal masuk, dan status kepegawaian.",
                  "Foto profil.",
                ]}
              />

              <h3 className="pt-2 font-semibold text-foreground">
                b. Data kehadiran
              </h3>
              <Bullets
                items={[
                  "Foto selfie saat absen masuk dan pulang.",
                  "Waktu absensi yang dicatat server.",
                  "Koordinat lokasi, akurasi GPS, dan jarak ke lokasi kerja.",
                  "Status kehadiran, keterlambatan, pulang cepat, dan catatan absensi.",
                  "Informasi perangkat yang dipakai untuk absensi (device key) untuk membantu mencegah penyalahgunaan.",
                ]}
              />

              <h3 className="pt-2 font-semibold text-foreground">
                c. Data pengajuan dan kesejahteraan
              </h3>
              <Bullets
                items={[
                  "Izin, sakit, cuti, dinas luar, lembur, dan tukar shift.",
                  "Alasan pengajuan dan lampiran yang diunggah.",
                  "Saldo cuti, klaim jatah makan, jadwal training, dan daftar peserta.",
                ]}
              />

              <h3 className="pt-2 font-semibold text-foreground">
                d. Data penggajian
              </h3>
              <Bullets
                items={[
                  "Tipe gaji, gaji pokok, tunjangan, potongan, dan total gaji.",
                  "Nama bank, nomor rekening, dan nama pemilik rekening.",
                  "Riwayat pembayaran gaji internal.",
                ]}
              />

              <h3 className="pt-2 font-semibold text-foreground">
                e. Data penggunaan
              </h3>
              <Bullets
                items={[
                  "Notifikasi dan status baca.",
                  "Log audit internal untuk aktivitas penting.",
                  "Informasi teknis yang diperlukan untuk keamanan dan operasional aplikasi.",
                ]}
              />
            </Section>

            <Section id="penggunaan" title="3. Cara kami menggunakan data">
              <Bullets
                items={[
                  "Memverifikasi akun dan mengelola akses sesuai peran.",
                  "Mencatat dan memvalidasi kehadiran, termasuk selfie, waktu, dan lokasi.",
                  "Mengelola jadwal, pengajuan, cuti, klaim makan, dan training.",
                  "Menghitung serta mencatat penggajian internal.",
                  "Menyusun laporan kehadiran dan administrasi HR.",
                  "Mengirim notifikasi terkait pekerjaan.",
                  "Menjaga keamanan, mencegah penyalahgunaan, dan memenuhi kewajiban hukum.",
                ]}
              />
              <p>
                Kami tidak menjual data pribadi dan tidak memakai data untuk
                iklan.
              </p>
            </Section>

            <Section id="izin" title="4. Izin perangkat">
              <p>Aplikasi dapat meminta izin berikut:</p>
              <Bullets
                items={[
                  "Kamera — untuk foto absensi, foto profil, dan dokumen.",
                  "Lokasi — untuk validasi radius lokasi saat absensi.",
                  "Penyimpanan/file — untuk mengunggah lampiran dan membuka dokumen.",
                  "Internet — untuk mengakses server perusahaan.",
                ]}
              />
              <p>
                Pengguna dapat menolak izin, tetapi fitur yang membutuhkan izin
                tersebut tidak dapat digunakan.
              </p>
            </Section>

            <Section id="keamanan" title="5. Penyimpanan dan keamanan">
              <Bullets
                items={[
                  "Data dikirim melalui HTTPS.",
                  "Akses data dibatasi berdasarkan peran dan diperiksa di server.",
                  "Foto dan dokumen dilayani melalui endpoint terautentikasi.",
                  "Data disimpan pada database dan layanan hosting yang digunakan perusahaan.",
                  "Kami menerapkan langkah teknis dan organisasi yang wajar untuk melindungi data.",
                ]}
              />
              <p>
                Tidak ada sistem yang sepenuhnya bebas risiko. Laporkan insiden
                atau akses tidak sah melalui kontak privasi.
              </p>
            </Section>

            <Section id="berbagi" title="6. Berbagi dengan pihak lain">
              <p>
                Data dapat diproses oleh penyedia layanan yang membantu
                operasional aplikasi, misalnya:
              </p>
              <Bullets
                items={[
                  "Penyedia hosting/aplikasi.",
                  "Penyedia database.",
                  "Penyedia email transaksional jika diaktifkan.",
                  "Penyedia verifikasi wajah jika diaktifkan perusahaan.",
                ]}
              />
              <p>
                Penyedia tersebut memproses data untuk kepentingan operasional
                aplikasi. Kami tidak menjual data. Data juga dapat diungkapkan
                jika diwajibkan hukum atau diperlukan untuk melindungi hak dan
                keamanan.
              </p>
            </Section>

            <Section id="retensi" title="7. Retensi data">
              <p>
                Data disimpan selama hubungan kerja atau selama diperlukan untuk
                tujuan administrasi, hukum, dan audit. Masa retensi mengikuti
                kebijakan perusahaan. Setelah tidak diperlukan, data dapat
                dihapus atau dianonimkan sesuai kebijakan.
              </p>
            </Section>

            <Section id="hak" title="8. Hak pengguna">
              <p>Pengguna dapat meminta:</p>
              <Bullets
                items={[
                  "Akses dan salinan data pribadi.",
                  "Perbaikan data yang tidak akurat.",
                  "Penghapusan data, dengan memperhatikan kewajiban hukum dan administrasi.",
                  "Pembatasan atau keberatan atas pemrosesan tertentu.",
                  "Informasi tentang pemrosesan data.",
                ]}
              />
              <p>
                Permintaan dapat diajukan melalui HRD/Admin perusahaan atau
                kontak privasi.
              </p>
            </Section>

            <Section id="hapus-akun" title="9. Penghapusan akun">
              <p>
                Aplikasi belum menyediakan tombol hapus akun mandiri. Pengguna
                dapat meminta penghapusan akun dan data melalui HRD/Admin
                perusahaan atau kontak privasi. Permintaan diproses sesuai
                kebijakan retensi dan kewajiban hukum.
              </p>
            </Section>

            <Section id="anak" title="10. Anak-anak">
              <p>
                Aplikasi ditujukan untuk karyawan dewasa dan tidak dirancang
                untuk anak-anak di bawah 18 tahun.
              </p>
            </Section>

            <Section id="perubahan" title="11. Perubahan kebijakan">
              <p>
                Kebijakan ini dapat diperbarui. Versi terbaru akan
                dipublikasikan di halaman ini dengan tanggal berlaku baru.
              </p>
            </Section>

            <Section id="kontak" title="12. Kontak">
              <p>
                Pertanyaan tentang privasi dapat disampaikan melalui:
              </p>
              <div className="grid gap-2 rounded-lg border bg-background p-4 sm:grid-cols-2">
                <p className="flex items-start gap-2">
                  <Mail className="mt-1 size-4 shrink-0" aria-hidden="true" />
                  <span>{privacyConfig.email}</span>
                </p>
                <p className="flex items-start gap-2">
                  <Phone className="mt-1 size-4 shrink-0" aria-hidden="true" />
                  <span>{privacyConfig.phone}</span>
                </p>
                <p className="flex items-start gap-2 sm:col-span-2">
                  <MapPin className="mt-1 size-4 shrink-0" aria-hidden="true" />
                  <span>{privacyConfig.address}</span>
                </p>
              </div>
            </Section>
          </article>

          <div className="mt-10 border-t pt-6">
            <Button asChild variant="outline">
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
