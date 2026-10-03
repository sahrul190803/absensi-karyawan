import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { MasterDataAdmin } from "@/components/master-data-admin";

export const metadata: Metadata = { title: "Lokasi Kerja" };

export default async function AdminLokasiPage() {
  await requirePermission({ workLocations: ["read-any"] });
  return (
    <MasterDataAdmin
      title="Lokasi kerja"
      description="Kelola titik lokasi dan radius geofence (meter)."
      endpoint="/api/work-locations"
      columns={[
        { key: "name", label: "Nama" },
        { key: "address", label: "Alamat" },
        { key: "latitude", label: "Latitude", format: "mono" },
        { key: "longitude", label: "Longitude", format: "mono" },
        { key: "radiusM", label: "Radius (m)", format: "mono" },
        { key: "active", label: "Aktif", format: "boolean" },
      ]}
      fields={[
        { key: "name", label: "Nama lokasi", type: "text", required: true },
        { key: "address", label: "Alamat", type: "text" },
        { key: "latitude", label: "Latitude", type: "number", required: true },
        { key: "longitude", label: "Longitude", type: "number", required: true },
        {
          key: "radiusM",
          label: "Radius (meter)",
          type: "number",
          defaultValue: 100,
        },
        { key: "active", label: "Aktif", type: "boolean", defaultValue: true },
      ]}
    />
  );
}
