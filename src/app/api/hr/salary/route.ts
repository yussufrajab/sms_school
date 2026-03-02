import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

// ─────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────

const salaryStructureSchema = z.object({
  staffId: z.string().min(1, "Staff is required"),
  basicSalary: z.number().min(0, "Basic salary must be non-negative"),
  housingAllowance: z.number().min(0).default(0),
  transportAllowance: z.number().min(0).default(0),
  taxDeduction: z.number().min(0).default(0),
  pensionDeduction: z.number().min(0).default(0),
  healthDeduction: z.number().min(0).default(0),
});

// ─────────────────────────────────────────────
// GET /api/hr/salary — List salary structures
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
  const department = searchParams.get("department");

  try {
    const where: Record<string, unknown> = {};

    // Scope to school for non-super-admins
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      where.schoolId = session.user.schoolId;
    }

    if (department) {
      where.department = department;
    }

    const staffWithSalary = await prisma.staff.findMany({
      where,
      include: {
        User: { select: { email: true, name: true, image: true } },
        SalaryStructure: true,
        _count: { select: { TeachingAssignment: true } },
      },
      orderBy: { firstName: "asc" },
    });

    // Transform data for frontend
    const result = staffWithSalary.map((staff) => ({
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

    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/hr/salary]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// POST /api/hr/salary — Create/Update salary structure
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
    const data = salaryStructureSchema.parse(body);

    // Verify staff exists
    const staff = await prisma.staff.findUnique({
      where: { id: data.staffId },
      select: { id: true, schoolId: true },
    });

    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    // Check school access
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      if (staff.schoolId !== session.user.schoolId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Upsert salary structure
    const salaryStructure = await prisma.salaryStructure.upsert({
      where: { staffId: data.staffId },
      create: {
        id: randomUUID(),
        staffId: data.staffId,
        basicSalary: data.basicSalary,
        housingAllowance: data.housingAllowance,
        transportAllowance: data.transportAllowance,
        taxDeduction: data.taxDeduction,
        pensionDeduction: data.pensionDeduction,
        healthDeduction: data.healthDeduction,
        updatedAt: new Date(),
      },
      update: {
        basicSalary: data.basicSalary,
        housingAllowance: data.housingAllowance,
        transportAllowance: data.transportAllowance,
        taxDeduction: data.taxDeduction,
        pensionDeduction: data.pensionDeduction,
        healthDeduction: data.healthDeduction,
        updatedAt: new Date(),
      },
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
    });

    return NextResponse.json(salaryStructure, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[POST /api/hr/salary]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}