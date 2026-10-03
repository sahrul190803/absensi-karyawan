import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { DashboardView } from "./dashboard-view";

export const metadata: Metadata = { title: "Dashboard HR" };

export default async function AdminPage() {
  await requirePermission({ attendance: ["read-any"] });
  return <DashboardView />;
}
