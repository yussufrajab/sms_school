import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FinancialReportsClient } from "@/components/reports/financial-reports-client";

export const metadata = {
  title: "Financial Reports | School Management System",
  description: "View financial reports and fee collection analytics",
};

const ALLOWED_ROLES = [
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "ACCOUNTANT",
  "IT_ADMIN",
] as const;

export default async function FinancialReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!ALLOWED_ROLES.includes(session.user.role as (typeof ALLOWED_ROLES)[number])) {
    redirect("/dashboard");
  }

  const schoolId = session.user.schoolId;
  if (!schoolId) redirect("/login");

  // Get academic years
  const academicYears = await prisma.academicYear.findMany({
    where: { schoolId },
    select: { id: true, name: true, isCurrent: true },
    orderBy: { startDate: "desc" },
  });

  return <FinancialReportsClient academicYears={academicYears} />;
}