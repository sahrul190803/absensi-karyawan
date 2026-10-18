import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { DashboardView } from "./dashboard-view";

export const metadata: Metadata = { title: "Dashboard HR" };

export default async function AdminPage() {
  const session = await requirePermission({ attendance: ["read-any"] });
  const roles = (session.user.role ?? "user")
    .split(",")
    .map((role) => role.trim());
  const managerRole = roles.some((role) => ["hrd", "admin"].includes(role))
    ? "admin"
    : "hod";

  return <DashboardView role={managerRole} />;
}
