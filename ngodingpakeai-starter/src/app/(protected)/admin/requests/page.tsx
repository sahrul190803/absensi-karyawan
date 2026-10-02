import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { ApprovalsView } from "./approvals-view";

export const metadata: Metadata = { title: "Persetujuan Pengajuan" };

export default async function AdminRequestsPage() {
  await requirePermission({ requests: ["read-any"] });
  return <ApprovalsView />;
}
