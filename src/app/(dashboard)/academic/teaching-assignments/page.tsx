import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TeachingAssignmentsClient } from "@/components/academic/teaching-assignments-client";

export const metadata = { title: "Teaching Assignments" };

export default async function TeachingAssignmentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const allowedRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"];
  if (!allowedRoles.includes(session.user.role)) redirect("/dashboard");

  const schoolId = session.user.schoolId;

  const [assignments, staff, subjects, sections, academicYears] = await Promise.all([
    prisma.teachingAssignment.findMany({
      where: schoolId ? { Staff: { schoolId } } : {},
      include: {
        Staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            department: true,
            designation: true,
            User: { select: { email: true, image: true } },
          },
        },
        Subject: {
          select: { id: true, name: true, code: true, type: true },
        },
        Section: {
          select: {
            id: true,
            name: true,
            Class: { select: { id: true, name: true, level: true } },
          },
        },
      },
      orderBy: [
        { Staff: { firstName: "asc" } },
        { Subject: { name: "asc" } },
      ],
    }),
    prisma.staff.findMany({
      where: schoolId ? { schoolId, isActive: true } : { isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeId: true,
        department: true,
        designation: true,
        User: { select: { email: true, image: true } },
      },
      orderBy: { firstName: "asc" },
    }),
    prisma.subject.findMany({
      where: schoolId ? { schoolId } : {},
      select: { id: true, name: true, code: true, type: true },
      orderBy: { name: "asc" },
    }),
    prisma.section.findMany({
      where: schoolId ? { Class: { schoolId } } : {},
      select: {
        id: true,
        name: true,
        Class: { select: { id: true, name: true, level: true } },
      },
      orderBy: { Class: { level: "asc" } },
    }),
    prisma.academicYear.findMany({
      where: schoolId ? { schoolId } : {},
      select: { id: true, name: true, isCurrent: true },
      orderBy: { startDate: "desc" },
    }),
  ]);

  const canManage = ["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(session.user.role);

  return (
    <TeachingAssignmentsClient
      assignments={assignments.map((a) => ({
        id: a.id,
        staffId: a.staffId,
        subjectId: a.subjectId,
        sectionId: a.sectionId,
        academicYearId: a.academicYearId,
        createdAt: a.createdAt.toISOString(),
        staff: {
          id: a.Staff.id,
          firstName: a.Staff.firstName,
          lastName: a.Staff.lastName,
          employeeId: a.Staff.employeeId,
          department: a.Staff.department,
          designation: a.Staff.designation,
          user: a.Staff.User,
        },
        subject: a.Subject,
        section: {
          id: a.Section.id,
          name: a.Section.name,
          class: a.Section.Class,
        },
      }))}
      staff={staff.map((s) => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        employeeId: s.employeeId,
        department: s.department,
        designation: s.designation,
        user: s.User,
      }))}
      subjects={subjects}
      sections={sections.map((s) => ({
        id: s.id,
        name: s.name,
        class: s.Class,
      }))}
      academicYears={academicYears}
      canManage={canManage}
    />
  );
}
