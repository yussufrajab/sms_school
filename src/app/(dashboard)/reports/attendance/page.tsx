import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AttendanceReportsClient } from "@/components/reports/attendance-reports-client";

export const metadata = {
  title: "Attendance Reports | School Management System",
  description: "View attendance trends and analytics",
};

const ALLOWED_ROLES = [
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "TEACHER",
  "ACCOUNTANT",
  "IT_ADMIN",
] as const;

export default async function AttendanceReportsPage() {
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

  return <AttendanceReportsClient academicYears={academicYears} />;
}