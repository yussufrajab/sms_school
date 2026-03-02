import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StaffReportsClient } from "@/components/reports/staff-reports-client";

export const metadata = {
  title: "Staff Reports | School Management System",
  description: "View staff distribution and performance analytics",
};

const ALLOWED_ROLES = [
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "ACCOUNTANT",
  "IT_ADMIN",
] as const;

export default async function StaffReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!ALLOWED_ROLES.includes(session.user.role as (typeof ALLOWED_ROLES)[number])) {
    redirect("/dashboard");
  }

  return <StaffReportsClient />;
}