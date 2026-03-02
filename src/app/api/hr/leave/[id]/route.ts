import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

const updateLeaveSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "CANCELLED"]).optional(),
  reviewNotes: z.string().optional(),
});

// ─────────────────────────────────────────────
// GET /api/hr/leave/[id] — Get single leave application
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

  try {
    const application = await prisma.leaveApplication.findUnique({
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
            User: { select: { email: true, image: true } },
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Leave application not found" }, { status: 404 });
    }

    // Check access
    if (session.user.role === "TEACHER") {
      const staff = await prisma.staff.findFirst({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (!staff || staff.id !== application.staffId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      if (application.Staff.schoolId !== session.user.schoolId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json(application);
  } catch (error) {
    console.error("[GET /api/hr/leave/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// PUT /api/hr/leave/[id] — Update leave application (approve/reject)
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
    const existing = await prisma.leaveApplication.findUnique({
      where: { id },
      include: {
        Staff: { select: { schoolId: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Leave application not found" }, { status: 404 });
    }

    // Check school access
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      if (existing.Staff.schoolId !== session.user.schoolId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await req.json();
    const data = updateLeaveSchema.parse(body);

    // Only pending applications can be approved/rejected
    if (existing.status !== "PENDING" && data.status) {
      return NextResponse.json(
        { error: "Only pending applications can be approved or rejected" },
        { status: 400 }
      );
    }

    const application = await prisma.leaveApplication.update({
      where: { id },
      data: {
        status: data.status,
        reviewNotes: data.reviewNotes,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
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

    return NextResponse.json(application);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[PUT /api/hr/leave/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// DELETE /api/hr/leave/[id] — Delete leave application
// ─────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.leaveApplication.findUnique({
      where: { id },
      include: {
        Staff: { select: { schoolId: true, userId: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Leave application not found" }, { status: 404 });
    }

    // Check access - only owner or admin can delete
    const isOwner = existing.Staff.userId === session.user.id;
    const isAdmin = ["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(session.user.role as string);

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only pending or cancelled applications can be deleted
    if (!["PENDING", "CANCELLED"].includes(existing.status)) {
      return NextResponse.json(
        { error: "Only pending or cancelled applications can be deleted" },
        { status: 400 }
      );
    }

    await prisma.leaveApplication.delete({ where: { id } });

    return NextResponse.json({ message: "Leave application deleted successfully" });
  } catch (error) {
    console.error("[DELETE /api/hr/leave/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
