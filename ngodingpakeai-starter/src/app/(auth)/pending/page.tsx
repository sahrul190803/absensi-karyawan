import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { PendingView } from "./pending-view";

export const metadata: Metadata = { title: "Verifikasi Akun" };

export default async function PendingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession();
  const [employee] = await db
    .select({
      id: employees.id,
      nik: employees.nik,
      fullName: employees.fullName,
      phone: employees.phone,
      address: employees.address,
      employmentStatus: employees.employmentStatus,
    })
    .from(employees)
    .where(eq(employees.userId, session.user.id))
    .limit(1);

  const roles = (session.user.role ?? "user")
    .split(",")
    .map((role) => role.trim());
  const manager = roles.some((role) =>
    ["hrd", "admin", "hod"].includes(role),
  );
  if (employee?.employmentStatus === "active")
    redirect(manager ? "/admin" : "/app");

  const params = await searchParams;

  return (
    <PendingView
      employee={employee ?? null}
      userName={session.user.name}
      userEmail={session.user.email}
      errorCode={params.error ?? null}
    />
  );
}
