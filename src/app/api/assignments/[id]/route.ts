import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

// ─────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────

const updateAssignmentSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional(),
  subjectId: z.string().min(1, "Subject is required").optional(),
  dueDate: z.string().min(1, "Due date is required").optional(),
  maxMarks: z.number().positive("Max marks must be positive").optional(),
  allowLate: z.boolean().optional(),
  latePenalty: z.number().min(0).max(100).optional(),
  fileUrl: z.string().url().optional().or(z.literal("")),
});

// ─────────────────────────────────────────────
// GET /api/assignments/[id] — Get single assignment
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
    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        Subject: { select: { id: true, name: true, code: true } },
        Section: {
          select: {
            id: true,
            name: true,
            Class: { select: { id: true, name: true, schoolId: true } },
          },
        },
        AssignmentSubmission: {
          include: {
            Student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                studentId: true,
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    // Verify school access
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      if (assignment.Section.Class.schoolId !== session.user.schoolId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json(assignment);
  } catch (error) {
    console.error("[GET /api/assignments/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// PUT /api/assignments/[id] — Update assignment
// ─────────────────────────────────────────────

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles: UserRole[] = ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"];
  if (!allowedRoles.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.assignment.findUnique({
      where: { id },
      include: { Section: { include: { Class: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    // Verify school access
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      if (existing.Section.Class.schoolId !== session.user.schoolId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Teachers can only edit their own assignments
    if (session.user.role === "TEACHER") {
      const staff = await prisma.staff.findFirst({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (!staff || existing.staffId !== staff.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await req.json();
    const data = updateAssignmentSchema.parse(body);

    // Verify subject if provided
    if (data.subjectId && session.user.schoolId) {
      const subject = await prisma.subject.findFirst({
        where: { id: data.subjectId, schoolId: session.user.schoolId },
      });
      if (!subject) {
        return NextResponse.json({ error: "Subject not found" }, { status: 404 });
      }
    }

    const assignment = await prisma.assignment.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        subjectId: data.subjectId,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        maxMarks: data.maxMarks,
        allowLate: data.allowLate,
        latePenalty: data.latePenalty,
        fileUrl: data.fileUrl,
      },
      include: {
        Subject: { select: { id: true, name: true, code: true } },
        Section: {
          select: { id: true, name: true, Class: { select: { id: true, name: true } } },
        },
      },
    });

    return NextResponse.json(assignment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[PUT /api/assignments/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// DELETE /api/assignments/[id] — Delete assignment
// ─────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles: UserRole[] = ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"];
  if (!allowedRoles.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.assignment.findUnique({
      where: { id },
      include: { Section: { include: { Class: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    // Verify school access
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      if (existing.Section.Class.schoolId !== session.user.schoolId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Teachers can only delete their own assignments
    if (session.user.role === "TEACHER") {
      const staff = await prisma.staff.findFirst({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (!staff || existing.staffId !== staff.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Delete submissions first
    await prisma.assignmentSubmission.deleteMany({
      where: { assignmentId: id },
    });

    await prisma.assignment.delete({ where: { id } });

    return NextResponse.json({ message: "Assignment deleted successfully" });
  } catch (error) {
    console.error("[DELETE /api/assignments/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
