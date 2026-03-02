import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ClassesClient } from "@/components/academic/classes-client";

export const metadata = { title: "Classes & Sections" };

export default async function ClassesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const allowedRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"];
  if (!allowedRoles.includes(session.user.role)) redirect("/dashboard");

  const schoolId = session.user.schoolId;

  const [classes, sections] = await Promise.all([
    prisma.class.findMany({
      where: schoolId ? { schoolId } : {},
      include: {
        Section: {
          include: {
            _count: { select: { Student: true } },
          },
        },
        _count: { select: { Section: true } },
      },
      orderBy: { level: "asc" },
    }),
    prisma.section.findMany({
      where: schoolId ? { Class: { schoolId } } : {},
      include: {
        Class: true,
        _count: { select: { Student: true } },
      },
      orderBy: [{ Class: { level: "asc" } }, { name: "asc" }],
    }),
  ]);

  const canManage = ["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(session.user.role);

  // Transform to lowercase for client components
  const transformedClasses = classes.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    sections: c.Section.map((s) => ({
      id: s.id,
      name: s.name,
      classId: s.classId,
      _count: { students: s._count.Student },
    })),
    _count: { sections: c._count.Section },
  }));

  const transformedSections = sections.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    class: { id: s.Class.id, name: s.Class.name, level: s.Class.level },
    _count: { students: s._count.Student },
  }));

  return (
    <ClassesClient
      classes={transformedClasses}
      sections={transformedSections}
      canManage={canManage}
    />
  );
}
