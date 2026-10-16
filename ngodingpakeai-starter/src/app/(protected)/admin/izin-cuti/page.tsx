import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { IzinCutiShell } from "./izin-cuti-shell";

export const metadata: Metadata = { title: "Izin & Cuti" };

export default async function IzinCutiPage() {
  await requirePermission({ requests: ["read-any"] });
  return <IzinCutiShell />;
}
