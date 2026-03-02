import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TimetableViewClient from "@/components/timetable/timetable-view-client";
import TimetableManageClient from "@/components/timetable/timetable-manage-client";

export const metadata = {
  title: "Timetable | Academic | School Management System",
  description: "Manage class schedules and timetables",
};

export default async function AcademicTimetablePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userRole = session.user.role;
  const schoolId = session.user.schoolId;

  if (!schoolId) redirect("/login");

  // Fetch classes with sections for selection
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
    orderBy: [{ level: "asc" }, { name: "asc" }],
  });

  // Transform classes for client
  const transformedClasses = classes.map((c) => ({
    id: c.id,
    name: c.name,
    level: c.level,
    sections: c.Section,
  }));

  // Fetch subjects for the school
  const subjects = await prisma.subject.findMany({
    where: { schoolId },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  // Fetch staff (teachers) for assignment
  const staff = await prisma.staff.findMany({
    where: { schoolId },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  // For students, get their section
  let studentSection: { id: string; name: string; class: { id: string; name: string } } | null = null;
  if (userRole === "STUDENT") {
    const student = await prisma.student.findFirst({
      where: { userId: session.user.id },
      select: {
        sectionId: true,
        Section: {
          select: {
            id: true,
            name: true,
            Class: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (student?.Section) {
      studentSection = {
        id: student.Section.id,
        name: student.Section.name,
        class: { id: student.Section.Class.id, name: student.Section.Class.name },
      };
    }
  }

  // For teachers, get their staff ID
  let teacherStaffId: string | null = null;
  if (userRole === "TEACHER") {
    const teacher = await prisma.staff.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (teacher) {
      teacherStaffId = teacher.id;
    }
  }

  const canManage = userRole === "SUPER_ADMIN" || userRole === "SCHOOL_ADMIN";

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Timetable</h1>
        <p className="text-gray-600 mt-1">
          {canManage
            ? "View and manage class schedules"
            : "View your class schedule"}
        </p>
      </div>

      {canManage ? (
        <TimetableManageClient
          classes={transformedClasses}
          subjects={subjects}
          staff={staff}
        />
      ) : (
        <TimetableViewClient
          classes={transformedClasses}
          studentSection={studentSection}
          teacherStaffId={teacherStaffId}
          userRole={userRole || ""}
        />
      )}
    </div>
  );
}
