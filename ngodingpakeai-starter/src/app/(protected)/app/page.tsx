import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { AttendanceHome } from "./attendance-home";

export const metadata: Metadata = { title: "Beranda Absensi" };

export default async function AppPage() {
  const { user } = await requireSession();
  return <AttendanceHome userName={user.name} />;
}
