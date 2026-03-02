import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Fee Management | Finance | School Management System",
  description: "Manage fee structures, invoices, and payments",
};

export default async function FinanceFeesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const allowedRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"];
  if (!allowedRoles.includes(session.user.role)) redirect("/dashboard");

  // Redirect to the main fees page which has all fee management functionality
  redirect("/fees");
}
