import { redirect } from "next/navigation";

// Persetujuan izin/cuti dan kuota kini berada di dalam halaman Attendant.
export default function IzinCutiRedirectPage() {
  redirect("/admin/jadwal");
}
