import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { CalendarView } from "./calendar-view";

export const metadata: Metadata = { title: "Kalender" };

export default async function AdminKalenderPage() {
  await requirePermission({ schedules: ["read-any"] });
  return <CalendarView />;
}
