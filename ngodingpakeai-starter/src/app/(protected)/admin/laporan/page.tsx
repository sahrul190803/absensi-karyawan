import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { ReportView } from "./report-view";

export const metadata: Metadata = { title: "Laporan Kehadiran" };

export default async function AdminLaporanPage() {
  await requirePermission({ reports: ["read-any"] });
  return <ReportView />;
}
