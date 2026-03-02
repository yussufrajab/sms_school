import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AcademicReportsClient } from "@/components/reports/academic-reports-client";

export const metadata = {
  title: "Academic Reports | School Management System",
  description: "View academic performance reports and analytics",
};

const ALLOWED_ROLES = [
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "TEACHER",
  "ACCOUNTANT",
  "IT_ADMIN",
] as const;

export default async function AcademicReportsPage() {
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

  // Get classes with sections
  const classes = await prisma.class.findMany({
    where: { schoolId },
    select: {
      id: true,
      name: true,
      level: true,
      Section: {
        select: { id: true, name: true },
      },
    },
    orderBy: { level: "asc" },
  });

  // Transform for client
  const transformedClasses = classes.map((c) => ({
    id: c.id,
    name: c.name,
    level: c.level,
    sections: c.Section,
  }));

  return (
    <AcademicReportsClient
      academicYears={academicYears}
      classes={transformedClasses}
    />
  );
}