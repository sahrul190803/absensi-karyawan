import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { NotificationsCenter } from "@/components/notifications-center";

export const metadata: Metadata = { title: "Notifikasi Admin" };

export default async function AdminNotifikasiPage() {
  await requireSession();
  return <NotificationsCenter title="Notifikasi Admin" />;
}
