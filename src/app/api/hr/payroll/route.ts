import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

// ─────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────

const generatePayrollSchema = z.object({
  academicYearId: z.string().min(1, "Academic year is required"),
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2100),
});

// ─────────────────────────────────────────────
// GET /api/hr/payroll — List payrolls
// ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles: UserRole[] = ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"];
  if (!allowedRoles.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const academicYearId = searchParams.get("academicYearId");
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  try {
    const where: Record<string, unknown> = {};

    if (academicYearId) where.academicYearId = academicYearId;
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);

    // Filter by school through academic year
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      where.AcademicYear = { schoolId: session.user.schoolId };
    }

    const payrolls = await prisma.payroll.findMany({
      where,
      include: {
        AcademicYear: {
          select: { id: true, name: true, schoolId: true },
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
    });

    return NextResponse.json(payrolls);
  } catch (error) {
    console.error("[GET /api/hr/payroll]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// POST /api/hr/payroll — Generate payroll
// ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles: UserRole[] = ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"];
  if (!allowedRoles.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = generatePayrollSchema.parse(body);

    // Verify academic year exists and belongs to school
    const academicYear = await prisma.academicYear.findUnique({
      where: { id: data.academicYearId },
      select: { id: true, schoolId: true, name: true },
    });

    if (!academicYear) {
      return NextResponse.json({ error: "Academic year not found" }, { status: 404 });
    }

    // Check school access
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      if (academicYear.schoolId !== session.user.schoolId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Check if payroll already exists for this month/year
    const existing = await prisma.payroll.findUnique({
      where: {
        academicYearId_month_year: {
          academicYearId: data.academicYearId,
          month: data.month,
          year: data.year,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Payroll already exists for this month" },
        { status: 400 }
      );
    }

    // Get all active staff with salary structures
    const staffWithSalary = await prisma.staff.findMany({
      where: {
        schoolId: academicYear.schoolId,
        isActive: true,
        SalaryStructure: { isNot: null },
      },
      include: {
        SalaryStructure: true,
        LeaveApplication: {
          where: {
            status: "APPROVED",
            startDate: {
              gte: new Date(data.year, data.month - 1, 1),
              lt: new Date(data.year, data.month, 1),
            },
          },
        },
      },
    });

    if (staffWithSalary.length === 0) {
      return NextResponse.json(
        { error: "No staff with salary structures found" },
        { status: 400 }
      );
    }

    // Calculate payroll items
    const payrollItems = staffWithSalary.map((staff) => {
      const salary = staff.SalaryStructure!;
      
      // Calculate leave deduction (simple: deduct based on unpaid leave days)
      const unpaidLeaveDays = staff.LeaveApplication
        .filter((la) => la.type === "UNPAID")
        .reduce((total, la) => {
          const start = new Date(la.startDate);
          const end = new Date(la.endDate);
          return total + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        }, 0);

      // Simple deduction: per day salary * unpaid days
      const dailyRate = salary.basicSalary / 22; // Assuming 22 working days
      const leaveDeduction = dailyRate * unpaidLeaveDays;

      const grossSalary = salary.basicSalary + salary.housingAllowance + salary.transportAllowance;
      const totalDeductions = salary.taxDeduction + salary.pensionDeduction + salary.healthDeduction + leaveDeduction;
      const netSalary = grossSalary - totalDeductions;

      return {
        staffId: staff.id,
        basicSalary: salary.basicSalary,
        housingAllowance: salary.housingAllowance,
        transportAllowance: salary.transportAllowance,
        grossSalary,
        taxDeduction: salary.taxDeduction,
        pensionDeduction: salary.pensionDeduction,
        healthDeduction: salary.healthDeduction,
        leaveDeduction,
        netSalary,
      };
    });

    const totalAmount = payrollItems.reduce((sum, item) => sum + item.netSalary, 0);

    // Create payroll with items
    const payroll = await prisma.payroll.create({
      data: {
        id: randomUUID(),
        academicYearId: data.academicYearId,
        month: data.month,
        year: data.year,
        totalAmount,
        updatedAt: new Date(),
        PayrollItem: {
          create: payrollItems.map((item) => ({
            id: randomUUID(),
            staffId: item.staffId,
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
        },
      },
      include: {
        AcademicYear: { select: { id: true, name: true } },
        PayrollItem: {
          include: {
            Staff: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeId: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(payroll, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[POST /api/hr/payroll]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}