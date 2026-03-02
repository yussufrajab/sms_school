import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRoleDashboardPath } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Redirect to role-specific dashboard
  const path = getRoleDashboardPath(session.user.role);
  redirect(path);
}
