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
  examDate: z.string().min(1, "Exam date is required").optional(),
  startTime: z.string().optional().nullable(),
  duration: z.number().min(1).max(600).optional().nullable(),
  venue: z.string().optional().nullable(),
});

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

    // Check exam subject exists and user has access
    const examSubject = await prisma.examSubject.findFirst({
      where: { id: subjectId, examId: id },
      include: {
        Exam: { select: { schoolId: true } },
      },
    });

    if (!examSubject) {
      return NextResponse.json({ error: "Exam subject not found" }, { status: 404 });
    }

    if (session.user.role !== "SUPER_ADMIN" && examSubject.Exam.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.examSubject.update({
      where: { id: subjectId },
      data: {
        ...(data.maxMarks !== undefined && { maxMarks: data.maxMarks }),
        ...(data.passMark !== undefined && { passMark: data.passMark }),
        ...(data.examDate !== undefined && { examDate: new Date(data.examDate) }),
        ...(data.startTime !== undefined && { startTime: data.startTime || null }),
        ...(data.duration !== undefined && { duration: data.duration || null }),
        ...(data.venue !== undefined && { venue: data.venue || null }),
      },
      include: {
        Subject: { select: { id: true, name: true, code: true } },
        Section: {
          select: {
            id: true,
            name: true,
            Class: { select: { id: true, name: true, level: true } },
          },
        },
        _count: { select: { ExamResult: true } },
      },
    });

    const transformed = {
      id: updated.id,
      sectionId: updated.sectionId,
      maxMarks: updated.maxMarks,
      passMark: updated.passMark,
      examDate: updated.examDate.toISOString(),
      startTime: updated.startTime,
      duration: updated.duration,
      venue: updated.venue,
      subject: updated.Subject,
      section: { id: updated.Section.id, name: updated.Section.name, class: { id: updated.Section.Class.id, name: updated.Section.Class.name } },
      _count: { examResults: updated._count.ExamResult },
    };

    return NextResponse.json(transformed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    console.error("[PUT /api/exams/[id]/subjects/[subjectId]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// DELETE /api/exams/[id]/subjects/[subjectId] — Remove subject from exam
// ─────────────────────────────────────────────

export async function DELETE(
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
    // Check exam subject exists and user has access
    const examSubject = await prisma.examSubject.findFirst({
      where: { id: subjectId, examId: id },
      include: {
        Exam: { select: { schoolId: true } },
      },
    });

    if (!examSubject) {
      return NextResponse.json({ error: "Exam subject not found" }, { status: 404 });
    }

    if (session.user.role !== "SUPER_ADMIN" && examSubject.Exam.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete results first, then the subject
    await prisma.examResult.deleteMany({
      where: { examSubjectId: subjectId },
    });

    await prisma.examSubject.delete({
      where: { id: subjectId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/exams/[id]/subjects/[subjectId]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
