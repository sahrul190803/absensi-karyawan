import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { PayrollView, type PayrollTab } from "./payroll-view";

export const metadata: Metadata = { title: "Penggajian" };

const TAB_VALUES: PayrollTab[] = ["setting", "pay", "history"];

export default async function AdminPenggajianPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  await requirePermission({ payroll: ["read-any"] });
  const { tab } = await searchParams;
  const requested = Array.isArray(tab) ? tab[0] : tab;
  const initialTab =
    TAB_VALUES.find((value) => value === requested) ?? "setting";
  return <PayrollView initialTab={initialTab} />;
}
