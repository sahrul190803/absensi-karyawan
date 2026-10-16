import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { TrainingAdmin } from "./training-admin";

export const metadata: Metadata = { title: "Training" };

export default async function AdminTrainingPage() {
  await requirePermission({ trainings: ["read-any"] });
  return <TrainingAdmin />;
}
