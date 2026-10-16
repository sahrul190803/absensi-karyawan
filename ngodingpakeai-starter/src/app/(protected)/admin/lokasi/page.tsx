import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { LocationAdmin } from "./location-admin";

export const metadata: Metadata = { title: "Lokasi & Radius" };

export default async function AdminLokasiPage() {
  await requirePermission({ workLocations: ["read-any"] });
  return <LocationAdmin />;
}
