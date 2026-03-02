import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AuditLogsClient } from "@/components/admin/audit-logs-client";

export default async function AuditLogsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const allowedRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN", "IT_ADMIN"];
  if (!allowedRoles.includes(session.user.role)) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground">Track all system activities and changes</p>
      </div>

      <AuditLogsClient />
    </div>
  );
}
