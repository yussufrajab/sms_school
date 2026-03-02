import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AcademicYearsClient } from "@/components/academic/academic-years-client";

export const metadata = { title: "Academic Years" };

export default async function AcademicYearsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const allowedRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"];
  if (!allowedRoles.includes(session.user.role)) redirect("/dashboard");

  const schoolId = session.user.schoolId;

  const years = await prisma.academicYear.findMany({
    where: schoolId ? { schoolId } : {},
    include: {
      _count: { select: { Term: true, Exam: true } },
    },
    orderBy: { startDate: "desc" },
  });

  const canManage = ["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(session.user.role);

  return (
    <AcademicYearsClient
      years={years.map((y) => ({
        id: y.id,
        name: y.name,
        startDate: y.startDate.toISOString(),
        endDate: y.endDate.toISOString(),
        isCurrent: y.isCurrent,
        createdAt: y.createdAt.toISOString(),
        updatedAt: y.updatedAt.toISOString(),
        _count: { terms: y._count.Term, exams: y._count.Exam },
      }))}
      canManage={canManage}
    />
  );
}
