import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { SettingsView } from "./settings-view";

export const metadata: Metadata = { title: "Pengaturan" };

export default async function AdminPengaturanPage() {
  const session = await requirePermission({ settings: ["read-any"] });
  return (
    <SettingsView
      userEmail={session.user.email}
      userRole={session.user.role ?? "hrd"}
    />
  );
}
