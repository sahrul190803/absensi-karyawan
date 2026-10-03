import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { ProfileView } from "./profile-view";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilPage() {
  const { user } = await requireSession();
  return <ProfileView userName={user.name} userEmail={user.email} />;
}
