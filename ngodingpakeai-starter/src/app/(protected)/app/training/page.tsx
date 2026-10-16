import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { TrainingsView } from "./trainings-view";

export const metadata: Metadata = { title: "Jadwal Training" };

export default async function AppTrainingPage() {
  await requireSession();
  return <TrainingsView />;
}
