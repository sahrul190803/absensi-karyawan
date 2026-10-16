import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { AttendantShell } from "./attendant-shell";

export const metadata: Metadata = { title: "Attendant" };

export default async function AttendantPage() {
  await requireSession();
  return <AttendantShell />;
}
