import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

// ─────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────

const updateStaffSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT"]).optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  nationality: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  qualifications: z.string().optional(),
  isActive: z.boolean().optional(),
  photoUrl: z.string().url().optional(),
});

// ─────────────────────────────────────────────
// GET /api/staff/[id] — Fetch single staff with full details
// ─────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles: UserRole[] = [
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "IT_ADMIN",
  ];
  if (!allowedRoles.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            mfaEnabled: true,
            lastLoginAt: true,
            lastLoginIp: true,
            createdAt: true,
          },
        },
        TeachingAssignment: {
          include: {
            Subject: true,
            Section: {
              include: { Class: true },
            },
          },
        },
        Timetable: {
          include: {
            Subject: true,
            Section: {
              include: { Class: true },
            },
          },
          orderBy: [{ dayOfWeek: "asc" }, { periodNo: "asc" }],
        },
        LeaveApplication: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        StaffAttendance: {
          orderBy: { date: "desc" },
          take: 30,
        },
        PerformanceEvaluation: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        SalaryStructure: true,
        PayrollItem: {
          orderBy: { createdAt: "desc" },
          take: 12,
          include: {
            Payroll: {
              select: { month: true, year: true, isApproved: true },
            },
          },
        },
      },
    });

    if (!staff) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    // Scope check: non-super-admins can only view staff in their own school
    if (
      session.user.role !== "SUPER_ADMIN" &&
      staff.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(staff);
  } catch (error) {
    console.error("[GET /api/staff/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// PATCH /api/staff/[id] — Update staff details
// ─────────────────────────────────────────────

export async function PATCH(
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
    // Verify staff exists and belongs to the same school
    const existing = await prisma.staff.findUnique({
      where: { id },
      select: { id: true, schoolId: true, userId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    if (
      session.user.role !== "SUPER_ADMIN" &&
      existing.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const data = updateStaffSchema.parse(body);

    const updatedStaff = await prisma.$transaction(async (tx) => {
      // If name fields are changing, sync the User.name as well
      if (data.firstName !== undefined || data.lastName !== undefined) {
        const current = await tx.staff.findUnique({
          where: { id },
          select: { firstName: true, lastName: true },
        });
        const newFirst = data.firstName ?? current!.firstName;
        const newLast = data.lastName ?? current!.lastName;
        await tx.user.update({
          where: { id: existing.userId },
          data: { name: `${newFirst} ${newLast}` },
        });
      }

      // If isActive is being toggled, sync User.isActive as well
      if (data.isActive !== undefined) {
        await tx.user.update({
          where: { id: existing.userId },
          data: { isActive: data.isActive },
        });
      }

      return tx.staff.update({
        where: { id },
        data: {
          ...(data.firstName !== undefined && { firstName: data.firstName }),
          ...(data.lastName !== undefined && { lastName: data.lastName }),
          ...(data.department !== undefined && { department: data.department }),
          ...(data.designation !== undefined && { designation: data.designation }),
          ...(data.employmentType !== undefined && { employmentType: data.employmentType }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.dateOfBirth !== undefined && {
            dateOfBirth: new Date(data.dateOfBirth),
          }),
          ...(data.gender !== undefined && { gender: data.gender }),
          ...(data.nationality !== undefined && { nationality: data.nationality }),
          ...(data.address !== undefined && { address: data.address }),
          ...(data.emergencyContact !== undefined && {
            emergencyContact: data.emergencyContact,
          }),
          ...(data.qualifications !== undefined && {
            qualifications: data.qualifications,
          }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
          ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl }),
        },
        include: {
          User: {
            select: {
              id: true,
              email: true,
              role: true,
              isActive: true,
            },
          },
        },
      });
    });

    return NextResponse.json(updatedStaff);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[PATCH /api/staff/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// DELETE /api/staff/[id] — Soft delete (isActive = false, deletedAt = now)
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
    const existing = await prisma.staff.findUnique({
      where: { id },
      select: { id: true, schoolId: true, userId: true, deletedAt: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    if (existing.deletedAt) {
      return NextResponse.json(
        { error: "Staff member is already deleted" },
        { status: 409 }
      );
    }

    if (
      session.user.role !== "SUPER_ADMIN" &&
      existing.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Soft delete: mark staff as inactive and set deletedAt timestamp
    await prisma.$transaction([
      prisma.staff.update({
        where: { id },
        data: {
          isActive: false,
          deletedAt: new Date(),
        },
      }),
      prisma.user.update({
        where: { id: existing.userId },
        data: { isActive: false },
      }),
    ]);

    return NextResponse.json({ success: true, message: "Staff member deactivated" });
  } catch (error) {
    console.error("[DELETE /api/staff/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
