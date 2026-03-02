import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";

// ─────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────

const submitAssignmentSchema = z.object({
  content: z.string().optional(),
  fileUrl: z.string().url().optional().or(z.literal("")),
});

// ─────────────────────────────────────────────
// GET /api/assignments/[id]/submissions — List submissions
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
    // Verify assignment exists
    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        Section: { include: { Class: true } },
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

    // Students can only see their own submission
    if (session.user.role === "STUDENT") {
      const student = await prisma.student.findFirst({
        where: { userId: session.user.id },
        select: { id: true },
      });

      if (!student) {
        return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
      }

      const submission = await prisma.assignmentSubmission.findUnique({
        where: {
          assignmentId_studentId: {
            assignmentId: id,
            studentId: student.id,
          },
        },
        include: {
          Student: {
            select: { id: true, firstName: true, lastName: true, studentId: true },
          },
        },
      });

      return NextResponse.json(submission ? [submission] : []);
    }

    // Teachers and admins can see all submissions
    const submissions = await prisma.assignmentSubmission.findMany({
      where: { assignmentId: id },
      include: {
        Student: {
          select: { id: true, firstName: true, lastName: true, studentId: true },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    return NextResponse.json(submissions);
  } catch (error) {
    console.error("[GET /api/assignments/[id]/submissions]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// POST /api/assignments/[id]/submissions — Submit assignment
// ─────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Only students can submit assignments" }, { status: 403 });
  }

  const { id } = await params;

  try {
    // Get student profile
    const student = await prisma.student.findFirst({
      where: { userId: session.user.id },
      select: { id: true, sectionId: true },
    });

    if (!student) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    // Verify assignment exists and belongs to student's section
    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: { Section: { include: { Class: true } } },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    if (assignment.sectionId !== student.sectionId) {
      return NextResponse.json({ error: "This assignment is not for your section" }, { status: 403 });
    }

    // Check if already submitted
    const existingSubmission = await prisma.assignmentSubmission.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId: id,
          studentId: student.id,
        },
      },
    });

    if (existingSubmission) {
      return NextResponse.json({ error: "You have already submitted this assignment" }, { status: 400 });
    }

    // Check due date
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    const isLate = now > dueDate;

    if (isLate && !assignment.allowLate) {
      return NextResponse.json({ error: "Late submissions are not allowed for this assignment" }, { status: 400 });
    }

    const body = await req.json();
    const data = submitAssignmentSchema.parse(body);

    if (!data.content && !data.fileUrl) {
      return NextResponse.json({ error: "Please provide either content or a file URL" }, { status: 400 });
    }

    const submission = await prisma.assignmentSubmission.create({
      data: {
        id: randomUUID(),
        assignmentId: id,
        studentId: student.id,
        content: data.content,
        fileUrl: data.fileUrl || null,
        isLate,
      },
      include: {
        Student: {
          select: { id: true, firstName: true, lastName: true, studentId: true },
        },
      },
    });

    return NextResponse.json(submission, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[POST /api/assignments/[id]/submissions]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
