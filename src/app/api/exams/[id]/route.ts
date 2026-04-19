import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

// ─────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────

const updateExamSchema = z.object({
  name: z.string().min(1, "Exam name is required").optional(),
  termId: z.string().optional().nullable(),
  startDate: z.string().min(1, "Start date is required").optional(),
  endDate: z.string().min(1, "End date is required").optional(),
  isPublished: z.boolean().optional(),
});

// ─────────────────────────────────────────────
// GET /api/exams/[id] — Get single exam
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
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        AcademicYear: {
          select: { id: true, name: true },
        },
        Term: {
          select: { id: true, name: true },
        },
        ExamSubject: {
          include: {
            Subject: { select: { id: true, name: true, code: true } },
            Section: {
              select: { id: true, name: true, Class: { select: { id: true, name: true, level: true } } },
            },
            _count: { select: { ExamResult: true } },
          },
          orderBy: [{ examDate: "asc" }],
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // Check access
    if (session.user.role !== "SUPER_ADMIN" && exam.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(exam);
  } catch (error) {
    console.error("[GET /api/exams/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// PUT /api/exams/[id] — Update exam
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
    const body = await req.json();
    const data = updateExamSchema.parse(body);

    // Check exam exists and user has access
    const existingExam = await prisma.exam.findUnique({
      where: { id },
      select: { schoolId: true },
    });

    if (!existingExam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    if (session.user.role !== "SUPER_ADMIN" && existingExam.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.termId !== undefined) updateData.termId = data.termId || null;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
    if (data.isPublished !== undefined) updateData.isPublished = data.isPublished;

    const exam = await prisma.exam.update({
      where: { id },
      data: updateData,
      include: {
        AcademicYear: { select: { id: true, name: true } },
        Term: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(exam);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    console.error("[PUT /api/exams/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// DELETE /api/exams/[id] — Delete exam
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
    const exam = await prisma.exam.findUnique({
      where: { id },
      select: { schoolId: true },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    if (session.user.role !== "SUPER_ADMIN" && exam.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete in order: ExamResults -> ExamSubjects -> Exam
    // First, get all exam subject IDs
    const examSubjects = await prisma.examSubject.findMany({
      where: { examId: id },
      select: { id: true },
    });

    const examSubjectIds = examSubjects.map((es) => es.id);

    // Delete all exam results for these exam subjects
    if (examSubjectIds.length > 0) {
      await prisma.examResult.deleteMany({
        where: { examSubjectId: { in: examSubjectIds } },
      });
    }

    // Delete all exam subjects
    await prisma.examSubject.deleteMany({
      where: { examId: id },
    });

    // Finally delete the exam
    await prisma.exam.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/exams/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
