import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

// ─────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────

const gradeSubmissionSchema = z.object({
  marks: z.number().min(0, "Marks cannot be negative"),
  feedback: z.string().optional(),
});

// ─────────────────────────────────────────────
// PUT /api/assignments/[id]/submissions/[studentId] — Grade submission
// ─────────────────────────────────────────────

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles: UserRole[] = ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"];
  if (!allowedRoles.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, studentId } = await params;

  try {
    // Verify submission exists
    const submission = await prisma.assignmentSubmission.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId: id,
          studentId,
        },
      },
      include: {
        Assignment: {
          include: { Section: { include: { Class: true } } },
        },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Verify school access
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      if (submission.Assignment.Section.Class.schoolId !== session.user.schoolId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Teachers can only grade their own assignments
    if (session.user.role === "TEACHER") {
      const staff = await prisma.staff.findFirst({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (!staff || submission.Assignment.staffId !== staff.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await req.json();
    const data = gradeSubmissionSchema.parse(body);

    // Validate marks don't exceed max marks
    if (data.marks > submission.Assignment.maxMarks) {
      return NextResponse.json(
        { error: `Marks cannot exceed maximum marks (${submission.Assignment.maxMarks})` },
        { status: 400 }
      );
    }

    // Get grader staff ID
    let gradedBy: string | null = null;
    if (session.user.role === "TEACHER") {
      const staff = await prisma.staff.findFirst({
        where: { userId: session.user.id },
        select: { id: true },
      });
      gradedBy = staff?.id || null;
    }

    const updatedSubmission = await prisma.assignmentSubmission.update({
      where: {
        assignmentId_studentId: {
          assignmentId: id,
          studentId,
        },
      },
      data: {
        marks: data.marks,
        feedback: data.feedback,
        gradedAt: new Date(),
        gradedBy,
      },
      include: {
        Student: {
          select: { id: true, firstName: true, lastName: true, studentId: true },
        },
      },
    });

    return NextResponse.json(updatedSubmission);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[PUT /api/assignments/[id]/submissions/[studentId]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
