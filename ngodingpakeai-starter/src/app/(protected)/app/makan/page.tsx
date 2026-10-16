import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { MealClaimView } from "./meal-claim-view";

export const metadata: Metadata = { title: "Klaim Makan" };

export default async function AppMakanPage() {
  await requireSession();
  return <MealClaimView />;
}
