import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { AttendanceHistory } from "./attendance-history";

export const metadata: Metadata = { title: "Riwayat Absensi" };

export default async function RiwayatPage() {
  await requireSession();
  return <AttendanceHistory />;
}
