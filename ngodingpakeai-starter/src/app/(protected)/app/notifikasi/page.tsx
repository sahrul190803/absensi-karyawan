import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { NotificationsCenter } from "@/components/notifications-center";

export const metadata: Metadata = { title: "Notifikasi" };

export default async function NotifikasiPage() {
  await requireSession();
  return <NotificationsCenter />;
}
