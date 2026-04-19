import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StudentsClient } from "@/components/students/students-client";

export const metadata = { title: "Students" };

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ sectionId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const allowedRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "RECEPTIONIST"];
  if (!allowedRoles.includes(session.user.role)) redirect("/dashboard");

  const schoolId = session.user.schoolId;
  const params = await searchParams;

  const sections = await prisma.section.findMany({
    where: schoolId ? { Class: { schoolId } } : {},
    include: { Class: true },
    orderBy: [{ Class: { level: "asc" } }, { name: "asc" }],
  });

  // Transform to lowercase for client components
  const transformedSections = sections.map(s => ({
    id: s.id,
    name: s.name,
    class: { id: s.Class.id, name: s.Class.name },
  }));

  return <StudentsClient sections={transformedSections} userRole={session.user.role} initialSectionId={params.sectionId} />;
}
