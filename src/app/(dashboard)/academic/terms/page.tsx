import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TermsClient } from "@/components/academic/terms-client";

export const metadata = { title: "Terms" };

export default async function TermsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const allowedRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"];
  if (!allowedRoles.includes(session.user.role)) redirect("/dashboard");

  const schoolId = session.user.schoolId;

  const [terms, academicYears] = await Promise.all([
    prisma.term.findMany({
      where: schoolId ? { AcademicYear: { schoolId } } : {},
      include: {
        AcademicYear: {
          select: { id: true, name: true, isCurrent: true },
        },
        _count: { select: { Exam: true } },
      },
      orderBy: { startDate: "asc" },
    }),
    prisma.academicYear.findMany({
      where: schoolId ? { schoolId } : {},
      select: { id: true, name: true, isCurrent: true },
      orderBy: { startDate: "desc" },
    }),
  ]);

  const canManage = ["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(session.user.role);

  return (
    <TermsClient
      terms={terms.map((t) => ({
        id: t.id,
        name: t.name,
        startDate: t.startDate.toISOString(),
        endDate: t.endDate.toISOString(),
        academicYearId: t.academicYearId,
        academicYear: t.AcademicYear,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        _count: { exams: t._count.Exam },
      }))}
      academicYears={academicYears}
      canManage={canManage}
    />
  );
}
