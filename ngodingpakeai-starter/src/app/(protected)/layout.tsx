import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { navForRoles } from "@/lib/nav";
import { requireSession } from "@/lib/session";
import { ROLE_LABELS } from "@/lib/permissions";

export const runtime = "nodejs";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const roleList = (session.user.role ?? "user")
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
  const manager = roleList.some((role) =>
    ["hrd", "admin", "hod"].includes(role),
  );
  const [employee] = await db
    .select({ status: employees.employmentStatus })
    .from(employees)
    .where(eq(employees.userId, session.user.id))
    .limit(1);
  if (employee && employee.status !== "active") redirect("/pending");
  if (!employee && !manager) redirect("/pending");

  const items = navForRoles(roleList);
  const roleLabel =
    roleList.map((role) => ROLE_LABELS[role] ?? role).join(" · ") || "Karyawan";

  return (
    <AppShell
      user={{ name: session.user.name, email: session.user.email }}
      roleLabel={roleLabel}
      items={items}
      managerMode={manager}
    >
      {children}
    </AppShell>
  );
}
