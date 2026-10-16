import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { PayrollView } from "./payroll-view";

export const metadata: Metadata = { title: "Penggajian" };

export default async function AdminPenggajianPage() {
  await requirePermission({ payroll: ["read-any"] });
  return <PayrollView />;
}
