import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { CorrectionsAdmin } from "./corrections-admin";

export const metadata: Metadata = { title: "Koreksi Absensi" };

export default async function AdminKoreksiPage() {
  await requirePermission({ attendance: ["read-any"] });
  return <CorrectionsAdmin />;
}
