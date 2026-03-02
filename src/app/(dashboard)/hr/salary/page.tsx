import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SalaryClient } from "@/components/hr/salary-client";

export const metadata = {
  title: "Salary Structure | School Management System",
  description: "Manage staff salary structures",
};

export default async function SalaryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const allowedRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"];
  if (!allowedRoles.includes(session.user.role)) redirect("/dashboard");

  const schoolId = session.user.schoolId;

  // Get staff with salary structures
  const staffWithSalary = await prisma.staff.findMany({
    where: schoolId ? { schoolId } : {},
    include: {
      User: { select: { email: true, name: true, image: true } },
      SalaryStructure: true,
    },
    orderBy: { firstName: "asc" },
  });

  // Get unique departments
  const departments = [...new Set(staffWithSalary.map((s) => s.department).filter(Boolean))];

  // Transform data for frontend
  const staffData = staffWithSalary.map((staff) => ({
    id: staff.id,
    employeeId: staff.employeeId,
    firstName: staff.firstName,
    lastName: staff.lastName,
    department: staff.department,
    designation: staff.designation,
    employmentType: staff.employmentType,
    isActive: staff.isActive,
    user: {
      email: staff.User.email,
      name: staff.User.name,
      image: staff.User.image,
    },
    salaryStructure: staff.SalaryStructure
      ? {
          id: staff.SalaryStructure.id,
          basicSalary: staff.SalaryStructure.basicSalary,
          housingAllowance: staff.SalaryStructure.housingAllowance,
          transportAllowance: staff.SalaryStructure.transportAllowance,
          taxDeduction: staff.SalaryStructure.taxDeduction,
          pensionDeduction: staff.SalaryStructure.pensionDeduction,
          healthDeduction: staff.SalaryStructure.healthDeduction,
          grossSalary:
            staff.SalaryStructure.basicSalary +
            staff.SalaryStructure.housingAllowance +
            staff.SalaryStructure.transportAllowance,
          totalDeductions:
            staff.SalaryStructure.taxDeduction +
            staff.SalaryStructure.pensionDeduction +
            staff.SalaryStructure.healthDeduction,
          netSalary:
            staff.SalaryStructure.basicSalary +
            staff.SalaryStructure.housingAllowance +
            staff.SalaryStructure.transportAllowance -
            staff.SalaryStructure.taxDeduction -
            staff.SalaryStructure.pensionDeduction -
            staff.SalaryStructure.healthDeduction,
        }
      : null,
  }));

  return (
    <SalaryClient
      staffData={staffData}
      departments={departments as string[]}
    />
  );
}
