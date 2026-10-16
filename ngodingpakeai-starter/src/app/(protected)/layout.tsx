import { AppShell } from "@/components/app-shell";
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
  const items = navForRoles(roleList);
  const roleLabel =
    roleList.map((role) => ROLE_LABELS[role] ?? role).join(" · ") || "Karyawan";

  return (
    <AppShell
      user={{ name: session.user.name, email: session.user.email }}
      roleLabel={roleLabel}
      items={items}
    >
      {children}
    </AppShell>
  );
}
