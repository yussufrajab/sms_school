import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ReportsClient } from "@/components/reports/reports-client";

export const metadata = {
  title: "Reports | School Management System",
  description: "View academic, financial, attendance, and staff reports",
};

const ALLOWED_ROLES = [
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "ACCOUNTANT",
  "IT_ADMIN",
] as const;

export default async function ReportsPage() {
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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <p className="text-muted-foreground">
          View comprehensive reports on academic performance, finances, attendance, and staff
        </p>
      </div>

      <ReportsClient
        academicYears={academicYears}
        classes={transformedClasses}
      />
    </div>
  );
}
