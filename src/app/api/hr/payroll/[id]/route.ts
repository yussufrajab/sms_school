import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

const updatePayrollSchema = z.object({
  isApproved: z.boolean().optional(),
  isLocked: z.boolean().optional(),
});

// ─────────────────────────────────────────────
// GET /api/hr/payroll/[id] — Get single payroll
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
    const payroll = await prisma.payroll.findUnique({
      where: { id },
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
      },
    });

    if (!payroll) {
      return NextResponse.json({ error: "Payroll not found" }, { status: 404 });
    }

    // Check school access
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      if (payroll.AcademicYear.schoolId !== session.user.schoolId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Calculate summary
    const summary = {
      totalGross: payroll.PayrollItem.reduce((sum, item) => sum + item.grossSalary, 0),
      totalDeductions: payroll.PayrollItem.reduce(
        (sum, item) => sum + item.taxDeduction + item.pensionDeduction + item.healthDeduction + item.leaveDeduction,
        0
      ),
      totalNet: payroll.PayrollItem.reduce((sum, item) => sum + item.netSalary, 0),
      staffCount: payroll.PayrollItem.length,
    };

    return NextResponse.json({ ...payroll, summary });
  } catch (error) {
    console.error("[GET /api/hr/payroll/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// PUT /api/hr/payroll/[id] — Update payroll (approve/lock)
// ─────────────────────────────────────────────

export async function PUT(
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
    const existing = await prisma.payroll.findUnique({
      where: { id },
      include: {
        AcademicYear: { select: { schoolId: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Payroll not found" }, { status: 404 });
    }

    // Check school access
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      if (existing.AcademicYear.schoolId !== session.user.schoolId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await req.json();
    const data = updatePayrollSchema.parse(body);

    // Validation for approval
    if (data.isApproved && !existing.isApproved) {
      // Can only approve unlocked payroll
      if (existing.isLocked) {
        return NextResponse.json(
          { error: "Cannot approve a locked payroll" },
          { status: 400 }
        );
      }
    }

    // Validation for locking
    if (data.isLocked && !existing.isLocked) {
      // Can only lock approved payroll
      if (!existing.isApproved) {
        return NextResponse.json(
          { error: "Can only lock approved payroll" },
          { status: 400 }
        );
      }
    }

    const payroll = await prisma.payroll.update({
      where: { id },
      data: {
        isApproved: data.isApproved,
        isLocked: data.isLocked,
        approvedBy: data.isApproved ? session.user.id : existing.approvedBy,
        approvedAt: data.isApproved ? new Date() : existing.approvedAt,
      },
      include: {
        AcademicYear: { select: { id: true, name: true } },
        _count: { select: { PayrollItem: true } },
      },
    });

    return NextResponse.json(payroll);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[PUT /api/hr/payroll/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// DELETE /api/hr/payroll/[id] — Delete payroll
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
    const existing = await prisma.payroll.findUnique({
      where: { id },
      include: {
        AcademicYear: { select: { schoolId: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Payroll not found" }, { status: 404 });
    }

    // Check school access
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      if (existing.AcademicYear.schoolId !== session.user.schoolId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Cannot delete locked payroll
    if (existing.isLocked) {
      return NextResponse.json(
        { error: "Cannot delete a locked payroll" },
        { status: 400 }
      );
    }

    // Delete payroll items first (cascade should handle this, but let's be explicit)
    await prisma.payrollItem.deleteMany({ where: { payrollId: id } });
    await prisma.payroll.delete({ where: { id } });

    return NextResponse.json({ message: "Payroll deleted successfully" });
  } catch (error) {
    console.error("[DELETE /api/hr/payroll/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}