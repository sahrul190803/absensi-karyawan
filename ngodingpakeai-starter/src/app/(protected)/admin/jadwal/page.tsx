import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { AttendantShell } from "./attendant-shell";

export const metadata: Metadata = { title: "Attendant" };

export default async function AdminJadwalPage() {
  await requirePermission({ schedules: ["read-any"] });
  return <AttendantShell />;
}
