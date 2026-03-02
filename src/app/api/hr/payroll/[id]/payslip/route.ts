import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

// ─────────────────────────────────────────────
// GET /api/hr/payroll/[id]/payslip — Get payslip for staff
// ─────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const staffId = searchParams.get("staffId");

  if (!staffId) {
    return NextResponse.json({ error: "Staff ID is required" }, { status: 400 });
  }

  try {
    // Check access
    const isOwner = await prisma.staff.findFirst({
      where: { id: staffId, userId: session.user.id },
    });
    const isAdmin = ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"].includes(
      session.user.role as UserRole
    );

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const payrollItem = await prisma.payrollItem.findFirst({
      where: {
        payrollId: id,
        staffId,
      },
      include: {
        Payroll: {
          include: {
            AcademicYear: {
              include: {
                School: {
                  select: {
                    id: true,
                    name: true,
                    address: true,
                    phone: true,
                    email: true,
                    logo: true,
                  },
                },
              },
            },
          },
        },
        Staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            department: true,
            designation: true,
            phone: true,
            User: { select: { email: true } },
          },
        },
      },
    });

    if (!payrollItem) {
      return NextResponse.json({ error: "Payslip not found" }, { status: 404 });
    }

    // Check school access for admins
    if (isAdmin && session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      if (payrollItem.Payroll.AcademicYear.School.id !== session.user.schoolId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Format payslip data
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const payslip = {
      id: payrollItem.id,
      payslipNumber: `PSL-${payrollItem.Payroll.year}${String(payrollItem.Payroll.month).padStart(2, "0")}-${payrollItem.Staff.employeeId}`,
      payPeriod: {
        month: payrollItem.Payroll.month,
        year: payrollItem.Payroll.year,
        monthName: monthNames[payrollItem.Payroll.month - 1],
      },
      generatedAt: new Date().toISOString(),
      school: payrollItem.Payroll.AcademicYear.School,
      staff: {
        ...payrollItem.Staff,
        email: payrollItem.Staff.User.email,
      },
      earnings: {
        basicSalary: payrollItem.basicSalary,
        housingAllowance: payrollItem.housingAllowance,
        transportAllowance: payrollItem.transportAllowance,
        grossSalary: payrollItem.grossSalary,
      },
      deductions: {
        tax: payrollItem.taxDeduction,
        pension: payrollItem.pensionDeduction,
        health: payrollItem.healthDeduction,
        leave: payrollItem.leaveDeduction,
        total: payrollItem.taxDeduction + payrollItem.pensionDeduction + payrollItem.healthDeduction + payrollItem.leaveDeduction,
      },
      netSalary: payrollItem.netSalary,
      isApproved: payrollItem.Payroll.isApproved,
      approvedAt: payrollItem.Payroll.approvedAt?.toISOString(),
    };

    return NextResponse.json(payslip);
  } catch (error) {
    console.error("[GET /api/hr/payroll/[id]/payslip]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}