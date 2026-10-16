import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { LOCATION_FREE_ROLES } from "@/lib/permissions";
import { AttendanceHome } from "./attendance-home";

export const metadata: Metadata = { title: "Beranda Absensi" };

export default async function AppPage() {
  const { user } = await requireSession();
  const roleList = (user.role ?? "user")
    .split(",")
    .map((role) => role.trim());
  const locationFree = LOCATION_FREE_ROLES.some((role) =>
    roleList.includes(role),
  );
  return <AttendanceHome userName={user.name} locationFree={locationFree} />;
}
