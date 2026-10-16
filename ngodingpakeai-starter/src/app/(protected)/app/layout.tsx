import { redirect } from "next/navigation";
import { ADMIN_ROLES } from "@/lib/permissions";
import { requireSession } from "@/lib/session";

// Area karyawan (absen, jadwal pribadi, pengajuan, klaim makan, profil) tidak
// berlaku untuk admin dan HRD. Mereka diarahkan ke dashboard admin.
export default async function EmployeeAreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireSession();
  const roleList = (user.role ?? "")
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
  if (ADMIN_ROLES.some((role) => roleList.includes(role))) redirect("/admin");
  return <>{children}</>;
}
