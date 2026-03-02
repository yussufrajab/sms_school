import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

// ─────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────

const updateExamSubjectSchema = z.object({
  maxMarks: z.number().min(1).max(1000).optional(),
  passMark: z.number().min(0).max(1000).optional(),
  examDate: z.string().min(1).optional(),
  startTime: z.string().optional().nullable(),
  duration: z.number().min(1).max(600).optional().nullable(),
  venue: z.string().optional().nullable(),
});

// ─────────────────────────────────────────────
// GET /api/exams/[id]/subjects/[subjectId] — Get single exam subject
// ─────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subjectId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, subjectId } = await params;

  try {
    const examSubject = await prisma.examSubject.findUnique({
      where: { id: subjectId },
      include: {
        Exam: { select: { schoolId: true } },
        Subject: { select: { id: true, name: true, code: true } },
        Section: {
          select: {
            id: true,
            name: true,
            Class: { select: { id: true, name: true, level: true } },
          },
        },
      },
    });

    if (!examSubject) {
      return NextResponse.json({ error: "Exam subject not found" }, { status: 404 });
    }

    if (examSubject.examId !== id) {
      return NextResponse.json({ error: "Invalid exam subject" }, { status: 400 });
    }

    if (session.user.role !== "SUPER_ADMIN" && examSubject.Exam.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(examSubject);
  } catch (error) {
    console.error("[GET /api/exams/[id]/subjects/[subjectId]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// PUT /api/exams/[id]/subjects/[subjectId] — Update exam subject
// ─────────────────────────────────────────────

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subjectId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles: UserRole[] = ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"];
  if (!allowedRoles.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, subjectId } = await params;

  try {
    const body = await req.json();
    const data = updateExamSubjectSchema.parse(body);

    const examSubject = await prisma.examSubject.findUnique({
      where: { id: subjectId },
      include: { Exam: { select: { schoolId: true } } },
    });

    if (!examSubject) {
      return NextResponse.json({ error: "Exam subject not found" }, { status: 404 });
    }

    if (examSubject.examId !== id) {
      return NextResponse.json({ error: "Invalid exam subject" }, { status: 400 });
    }

    if (session.user.role !== "SUPER_ADMIN" && examSubject.Exam.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    if (data.maxMarks !== undefined) updateData.maxMarks = data.maxMarks;
    if (data.passMark !== undefined) updateData.passMark = data.passMark;
    if (data.examDate !== undefined) updateData.examDate = new Date(data.examDate);
    if (data.startTime !== undefined) updateData.startTime = data.startTime;
    if (data.duration !== undefined) updateData.duration = data.duration;
    if (data.venue !== undefined) updateData.venue = data.venue;

    const updated = await prisma.examSubject.update({
      where: { id: subjectId },
      data: updateData,
      include: {
        Subject: { select: { id: true, name: true, code: true } },
        Section: {
          select: {
            id: true,
            name: true,
            Class: { select: { id: true, name: true, level: true } },
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    console.error("[PUT /api/exams/[id]/subjects/[subjectId]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// DELETE /api/exams/[id]/subjects/[subjectId] — Delete exam subject
// ─────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subjectId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles: UserRole[] = ["SUPER_ADMIN", "SCHOOL_ADMIN"];
  if (!allowedRoles.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, subjectId } = await params;

  try {
    const examSubject = await prisma.examSubject.findUnique({
      where: { id: subjectId },
      include: { Exam: { select: { schoolId: true } } },
    });

    if (!examSubject) {
      return NextResponse.json({ error: "Exam subject not found" }, { status: 404 });
    }

    if (examSubject.examId !== id) {
      return NextResponse.json({ error: "Invalid exam subject" }, { status: 400 });
    }

    if (session.user.role !== "SUPER_ADMIN" && examSubject.Exam.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete will cascade to examResults
    await prisma.examSubject.delete({ where: { id: subjectId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/exams/[id]/subjects/[subjectId]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
