import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { AuditView } from "./audit-view";

export const metadata: Metadata = { title: "Audit Log" };

export default async function AdminAuditPage() {
  await requirePermission({ audit: ["read-any"] });
  return <AuditView />;
}
