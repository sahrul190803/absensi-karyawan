import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { RequestsView } from "./requests-view";

export const metadata: Metadata = { title: "Pengajuan" };

export default async function PengajuanPage() {
  await requireSession();
  return <RequestsView />;
}
