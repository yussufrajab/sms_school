import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StaffClient } from "@/components/staff/staff-client";

export const metadata = { title: "Staff" };

export default async function StaffPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const allowedRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN", "IT_ADMIN"];
  if (!allowedRoles.includes(session.user.role)) redirect("/dashboard");

  const schoolId = session.user.schoolId;

  const [staff, departments] = await Promise.all([
    prisma.staff.findMany({
      where: schoolId ? { schoolId } : {},
      include: {
        User: { select: { email: true, name: true, image: true } },
        SalaryStructure: true,
        _count: { select: { TeachingAssignment: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.staff.findMany({
      where: schoolId ? { schoolId } : {},
      select: { department: true },
      distinct: ["department"],
    }),
  ]);

  const departmentList = departments
    .map((d) => d.department)
    .filter((d): d is string => d !== null);

  const canManage = ["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(session.user.role);

  return (
    <StaffClient
      staff={staff.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        dateOfBirth: s.dateOfBirth?.toISOString() ?? null,
        startDate: s.startDate.toISOString(),
        deletedAt: s.deletedAt?.toISOString() ?? null,
        user: {
          email: s.User.email,
          name: s.User.name,
          image: s.User.image,
        },
        salaryStructure: s.SalaryStructure
          ? {
              ...s.SalaryStructure,
              createdAt: s.SalaryStructure.createdAt.toISOString(),
              updatedAt: s.SalaryStructure.updatedAt.toISOString(),
            }
          : null,
        _count: {
          teachingAssignments: s._count.TeachingAssignment,
        },
      }))}
      departments={departmentList}
      canManage={canManage}
    />
  );
}
