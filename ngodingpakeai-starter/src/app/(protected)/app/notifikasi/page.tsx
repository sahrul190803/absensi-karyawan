import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { NotificationsView } from "./notifications-view";

export const metadata: Metadata = { title: "Notifikasi" };

export default async function NotifikasiPage() {
  await requireSession();
  return <NotificationsView />;
}
