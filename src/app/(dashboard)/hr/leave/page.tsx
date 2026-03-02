import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { LeaveClient } from "@/components/hr/leave-client";

export const metadata = {
  title: "Leave Management | School Management System",
  description: "Manage staff leave applications",
};

export default async function LeavePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const allowedRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "ACCOUNTANT"];
  if (!allowedRoles.includes(session.user.role)) redirect("/dashboard");

  const schoolId = session.user.schoolId;

  // Get staff list for dropdown (for admins)
  const staffList = session.user.role !== "TEACHER"
    ? await prisma.staff.findMany({
        where: schoolId ? { schoolId, isActive: true } : { isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          department: true,
        },
        orderBy: { firstName: "asc" },
      })
    : [];

  // Get current staff for teachers
  const currentStaff = session.user.role === "TEACHER"
    ? await prisma.staff.findFirst({
        where: { userId: session.user.id },
        select: { id: true },
      })
    : null;

  // Get leave applications
  const where: Record<string, unknown> = {};
  
  if (session.user.role === "TEACHER" && currentStaff) {
    where.staffId = currentStaff.id;
  } else if (schoolId) {
    where.Staff = { schoolId };
  }

  const applications = await prisma.leaveApplication.findMany({
    where,
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
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const canManage = ["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(session.user.role);

  return (
    <LeaveClient
      applications={applications.map((app) => ({
        ...app,
        startDate: app.startDate.toISOString(),
        endDate: app.endDate.toISOString(),
        createdAt: app.createdAt.toISOString(),
        updatedAt: app.updatedAt.toISOString(),
        reviewedAt: app.reviewedAt?.toISOString() || null,
        staff: {
          id: app.Staff.id,
          firstName: app.Staff.firstName,
          lastName: app.Staff.lastName,
          employeeId: app.Staff.employeeId,
          department: app.Staff.department,
          designation: app.Staff.designation,
          user: app.Staff.User ? {
            email: app.Staff.User.email,
            image: app.Staff.User.image ?? undefined,
          } : { email: "", image: undefined },
        },
      }))}
      staffList={staffList}
      canManage={canManage}
      isTeacher={session.user.role === "TEACHER"}
      currentStaffId={currentStaff?.id || null}
    />
  );
}
