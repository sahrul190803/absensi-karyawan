import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, employees } from "@/db/schema";
import { ApiError } from "@/lib/api";
import { notifyUserInBackground } from "@/services/notifications.service";
import type { AppreciationInput } from "@/validators/appreciations";

// Ucapan apresiasi / peringatan dari HRD. Dikirim sebagai notifikasi in-app
// + email (via notifications service) dan dicatat di audit log.
export async function sendAppreciation(
  actorId: string,
  input: AppreciationInput,
) {
  const [employee] = await db
    .select({
      id: employees.id,
      userId: employees.userId,
      fullName: employees.fullName,
    })
    .from(employees)
    .where(eq(employees.id, input.employeeId))
    .limit(1);
  if (!employee)
    throw new ApiError(404, "NOT_FOUND", "Karyawan tidak ditemukan.");

  const praise = input.kind === "praise";
  notifyUserInBackground(employee.userId, {
    event: praise ? "appreciation-praise" : "appreciation-warning",
    type: praise ? "appreciation-praise" : "appreciation-warning",
    title: praise ? "Ucapan apresiasi dari HRD" : "Peringatan dari HRD",
    body: input.message,
  });

  await db.insert(auditLogs).values({
    userId: actorId,
    action: praise ? "appreciation-praise" : "appreciation-warning",
    entity: "employees",
    entityId: employee.id,
    newValue: { message: input.message },
  });

  return { employeeName: employee.fullName, kind: input.kind };
}
