import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

// ─────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────

const leaveApplicationSchema = z.object({
  staffId: z.string().min(1, "Staff is required"),
  type: z.enum(["ANNUAL", "SICK", "MATERNITY", "PATERNITY", "UNPAID", "EMERGENCY"]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().min(1, "Reason is required"),
  fileUrl: z.string().optional(),
});

// ─────────────────────────────────────────────
// GET /api/hr/leave — List leave applications
// ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const staffId = searchParams.get("staffId");
  const type = searchParams.get("type");

  try {
    const where: Record<string, unknown> = {};

    // Staff can only see their own leave applications
    if (session.user.role === "TEACHER") {
      const staff = await prisma.staff.findFirst({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (!staff) {
        return NextResponse.json({ error: "Staff profile not found" }, { status: 404 });
      }
      where.staffId = staff.id;
    } else if (staffId) {
      where.staffId = staffId;
    }

    if (status) where.status = status;
    if (type) where.type = type;

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
    });

    // Transform to lowercase for client compatibility
    const transformed = applications.map((app) => ({
      ...app,
      staff: app.Staff
        ? {
            id: app.Staff.id,
            firstName: app.Staff.firstName,
            lastName: app.Staff.lastName,
            employeeId: app.Staff.employeeId,
            department: app.Staff.department,
            designation: app.Staff.designation,
            user: app.Staff.User,
          }
        : null,
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("[GET /api/hr/leave]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// POST /api/hr/leave — Create leave application
// ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles: UserRole[] = ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "ACCOUNTANT"];
  if (!allowedRoles.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = leaveApplicationSchema.parse(body);

    // Validate dates
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (endDate < startDate) {
      return NextResponse.json(
        { error: "End date cannot be before start date" },
        { status: 400 }
      );
    }

    // Verify staff exists
    const staff = await prisma.staff.findUnique({
      where: { id: data.staffId },
      select: { id: true, schoolId: true },
    });

    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    // Check school access for non-super-admins
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      if (staff.schoolId !== session.user.schoolId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Check for overlapping leave applications
    const overlapping = await prisma.leaveApplication.findFirst({
      where: {
        staffId: data.staffId,
        status: { in: ["PENDING", "APPROVED"] },
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    });

    if (overlapping) {
      return NextResponse.json(
        { error: "There is already a leave application for this period" },
        { status: 400 }
      );
    }

    const application = await prisma.leaveApplication.create({
      data: {
        id: randomUUID(),
        staffId: data.staffId,
        type: data.type,
        startDate,
        endDate,
        reason: data.reason,
        fileUrl: data.fileUrl,
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

    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[POST /api/hr/leave]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
