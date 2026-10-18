import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { AttendantShell, type TabValue } from "./attendant-shell";

export const metadata: Metadata = { title: "Attendant" };

const TAB_VALUES: TabValue[] = ["create", "request", "view"];

export default async function AdminJadwalPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  await requirePermission({ schedules: ["read-any"] });
  const { tab } = await searchParams;
  const requested = Array.isArray(tab) ? tab[0] : tab;
  const initialTab =
    TAB_VALUES.find((value) => value === requested) ?? "create";
  return <AttendantShell initialTab={initialTab} />;
}
