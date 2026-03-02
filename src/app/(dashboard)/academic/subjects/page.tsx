import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SubjectsClient } from "@/components/academic/subjects-client";

export const metadata = { title: "Subjects" };

export default async function SubjectsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const allowedRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"];
  if (!allowedRoles.includes(session.user.role)) redirect("/dashboard");

  const schoolId = session.user.schoolId;

  const subjects = await prisma.subject.findMany({
    where: schoolId ? { schoolId } : {},
    include: {
      _count: { select: { TeachingAssignment: true, Timetable: true } },
    },
    orderBy: { name: "asc" },
  });

  const canManage = ["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(session.user.role);

  return (
    <SubjectsClient
      subjects={subjects.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        _count: {
          teachingAssignments: s._count.TeachingAssignment,
          timetables: s._count.Timetable,
        },
      }))}
      canManage={canManage}
    />
  );
}
