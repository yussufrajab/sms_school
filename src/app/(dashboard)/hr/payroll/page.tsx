import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PayrollClient } from "@/components/hr/payroll-client";

export const metadata = {
  title: "Payroll Management | School Management System",
  description: "Generate and manage staff payroll",
};

export default async function PayrollPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const allowedRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"];
  if (!allowedRoles.includes(session.user.role)) redirect("/dashboard");

  const schoolId = session.user.schoolId;

  // Get academic years for dropdown
  const academicYears = await prisma.academicYear.findMany({
    where: schoolId ? { schoolId } : {},
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
    },
    orderBy: { startDate: "desc" },
  });

  // Get payrolls
  const where: Record<string, unknown> = {};
  if (schoolId) {
    where.AcademicYear = { schoolId };
  }

  const payrolls = await prisma.payroll.findMany({
    where,
    include: {
      AcademicYear: {
        select: { id: true, name: true },
      },
      PayrollItem: {
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
      },
      _count: { select: { PayrollItem: true } },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    take: 50,
  });

  // Transform data for frontend
  const payrollData = payrolls.map((payroll) => ({
    id: payroll.id,
    academicYearId: payroll.academicYearId,
    academicYear: payroll.AcademicYear.name,
    month: payroll.month,
    year: payroll.year,
    totalAmount: payroll.totalAmount,
    isApproved: payroll.isApproved,
    isLocked: payroll.isLocked,
    status: payroll.isLocked ? "LOCKED" : payroll.isApproved ? "APPROVED" : "DRAFT" as "DRAFT" | "APPROVED" | "LOCKED",
    createdAt: payroll.createdAt.toISOString(),
    itemCount: payroll._count.PayrollItem,
    items: payroll.PayrollItem.map((item) => ({
      id: item.id,
      staffId: item.staffId,
      staff: {
        id: item.Staff.id,
        firstName: item.Staff.firstName,
        lastName: item.Staff.lastName,
        employeeId: item.Staff.employeeId,
        department: item.Staff.department,
        designation: item.Staff.designation,
        user: {
          email: item.Staff.User.email,
          image: item.Staff.User.image,
        },
      },
      basicSalary: item.basicSalary,
      housingAllowance: item.housingAllowance,
      transportAllowance: item.transportAllowance,
      grossSalary: item.grossSalary,
      taxDeduction: item.taxDeduction,
      pensionDeduction: item.pensionDeduction,
      healthDeduction: item.healthDeduction,
      leaveDeduction: item.leaveDeduction,
      netSalary: item.netSalary,
    })),
  }));

  return (
    <PayrollClient
      payrolls={payrollData}
      academicYears={academicYears.map((ay) => ({
        id: ay.id,
        name: ay.name,
      }))}
    />
  );
}
