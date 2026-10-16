import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { MealsAdminView } from "./meals-view";

export const metadata: Metadata = { title: "Klaim Makan" };

export default async function AdminMakanPage() {
  await requirePermission({ meals: ["read-any"] });
  return <MealsAdminView />;
}
