import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

const updateSalarySchema = z.object({
  basicSalary: z.number().min(0).optional(),
  housingAllowance: z.number().min(0).optional(),
  transportAllowance: z.number().min(0).optional(),
  taxDeduction: z.number().min(0).optional(),
  pensionDeduction: z.number().min(0).optional(),
  healthDeduction: z.number().min(0).optional(),
});

// ─────────────────────────────────────────────
// GET /api/hr/salary/[id] — Get single salary structure
// ─────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles: UserRole[] = ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"];
  if (!allowedRoles.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const salaryStructure = await prisma.salaryStructure.findUnique({
      where: { id },
      include: {
        Staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            department: true,
            designation: true,
            schoolId: true,
            User: { select: { email: true, name: true, image: true } },
          },
        },
      },
    });

    if (!salaryStructure) {
      return NextResponse.json({ error: "Salary structure not found" }, { status: 404 });
    }

    // Check school access
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      if (salaryStructure.Staff.schoolId !== session.user.schoolId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Calculate derived values
    const result = {
      ...salaryStructure,
      grossSalary:
        salaryStructure.basicSalary +
        salaryStructure.housingAllowance +
        salaryStructure.transportAllowance,
      totalDeductions:
        salaryStructure.taxDeduction +
        salaryStructure.pensionDeduction +
        salaryStructure.healthDeduction,
      netSalary:
        salaryStructure.basicSalary +
        salaryStructure.housingAllowance +
        salaryStructure.transportAllowance -
        salaryStructure.taxDeduction -
        salaryStructure.pensionDeduction -
        salaryStructure.healthDeduction,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/hr/salary/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// PUT /api/hr/salary/[id] — Update salary structure
// ─────────────────────────────────────────────

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles: UserRole[] = ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"];
  if (!allowedRoles.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.salaryStructure.findUnique({
      where: { id },
      include: {
        Staff: { select: { schoolId: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Salary structure not found" }, { status: 404 });
    }

    // Check school access
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      if (existing.Staff.schoolId !== session.user.schoolId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await req.json();
    const data = updateSalarySchema.parse(body);

    const salaryStructure = await prisma.salaryStructure.update({
      where: { id },
      data: {
        basicSalary: data.basicSalary,
        housingAllowance: data.housingAllowance,
        transportAllowance: data.transportAllowance,
        taxDeduction: data.taxDeduction,
        pensionDeduction: data.pensionDeduction,
        healthDeduction: data.healthDeduction,
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

    return NextResponse.json(salaryStructure);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[PUT /api/hr/salary/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// DELETE /api/hr/salary/[id] — Delete salary structure
// ─────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles: UserRole[] = ["SUPER_ADMIN", "SCHOOL_ADMIN"];
  if (!allowedRoles.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.salaryStructure.findUnique({
      where: { id },
      include: {
        Staff: { select: { schoolId: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Salary structure not found" }, { status: 404 });
    }

    // Check school access
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      if (existing.Staff.schoolId !== session.user.schoolId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    await prisma.salaryStructure.delete({ where: { id } });

    return NextResponse.json({ message: "Salary structure deleted successfully" });
  } catch (error) {
    console.error("[DELETE /api/hr/salary/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}