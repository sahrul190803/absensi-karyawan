import { redirect } from "next/navigation";

// Menu berdiri sendiri dihapus; kelola hari libur kini ada di tab Create
// halaman Attendant (bagian "Hari libur").
export default function HariLiburRedirectPage() {
  redirect("/admin/jadwal");
}
