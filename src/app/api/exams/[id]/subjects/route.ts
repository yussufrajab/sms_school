import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

// ─────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────

const createExamSubjectSchema = z.object({
  subjectId: z.string().min(1, "Subject is required"),
  sectionId: z.string().min(1, "Section is required"),
  maxMarks: z.number().min(1).max(1000).default(100),
  passMark: z.number().min(0).max(1000).default(40),
  examDate: z.string().min(1, "Exam date is required"),
  startTime: z.string().optional(),
  duration: z.number().min(1).max(600).optional(),
  venue: z.string().optional(),
});

// ─────────────────────────────────────────────
// GET /api/exams/[id]/subjects — List exam subjects
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
      select: { schoolId: true },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    if (session.user.role !== "SUPER_ADMIN" && exam.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const examSubjects = await prisma.examSubject.findMany({
      where: { examId: id },
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
      orderBy: [{ examDate: "asc" }],
    });

    // Transform to lowercase for client compatibility
    const transformed = examSubjects.map((es) => ({
      id: es.id,
      sectionId: es.sectionId,
      maxMarks: es.maxMarks,
      passMark: es.passMark,
      examDate: es.examDate.toISOString(),
      startTime: es.startTime,
      duration: es.duration,
      venue: es.venue,
      subject: es.Subject,
      section: { id: es.Section.id, name: es.Section.name, class: { id: es.Section.Class.id, name: es.Section.Class.name } },
      _count: { examResults: es._count.ExamResult },
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("[GET /api/exams/[id]/subjects]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// POST /api/exams/[id]/subjects — Add subject to exam
// ─────────────────────────────────────────────

export async function POST(
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
    const data = createExamSubjectSchema.parse(body);

    // Check exam exists and user has access
    const exam = await prisma.exam.findUnique({
      where: { id },
      select: { schoolId: true, startDate: true, endDate: true },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    if (session.user.role !== "SUPER_ADMIN" && exam.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify subject belongs to school
    const subject = await prisma.subject.findFirst({
      where: { id: data.subjectId, schoolId: session.user.schoolId! },
    });

    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    // Verify section belongs to school
    const section = await prisma.section.findFirst({
      where: { id: data.sectionId, Class: { schoolId: session.user.schoolId! } },
      include: { Class: true },
    });

    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    // Check if subject already added for this section
    const existing = await prisma.examSubject.findFirst({
      where: {
        examId: id,
        subjectId: data.subjectId,
        sectionId: data.sectionId,
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Subject already added for this section" }, { status: 400 });
    }

    const examSubject = await prisma.examSubject.create({
      data: {
        id: randomUUID(),
        examId: id,
        subjectId: data.subjectId,
        sectionId: data.sectionId,
        maxMarks: data.maxMarks,
        passMark: data.passMark,
        examDate: new Date(data.examDate),
        startTime: data.startTime,
        duration: data.duration,
        venue: data.venue,
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
      },
    });

    return NextResponse.json(examSubject, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    console.error("[POST /api/exams/[id]/subjects]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
