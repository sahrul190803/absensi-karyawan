import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { ScheduleView } from "./schedule-view";

export const metadata: Metadata = { title: "Jadwal Kerja" };

export default async function JadwalPage() {
  await requireSession();
  return <ScheduleView />;
}
