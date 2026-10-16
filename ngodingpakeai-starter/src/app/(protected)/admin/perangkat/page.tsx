import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { DevicesAdmin } from "./devices-admin";

export const metadata: Metadata = { title: "Perangkat" };

export default async function AdminDevicesPage() {
  await requirePermission({ devices: ["read-any"] });
  return <DevicesAdmin />;
}
