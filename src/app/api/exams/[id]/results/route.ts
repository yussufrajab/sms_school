import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

// ─────────────────────────────────────────────
// Grade calculation helper
// ─────────────────────────────────────────────

function calculateGrade(marks: number, maxMarks: number): string {
  const percentage = (marks / maxMarks) * 100;
  
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "F";
}

// ─────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────

const bulkResultsSchema = z.object({
  examSubjectId: z.string().min(1, "Exam subject is required"),
  results: z.array(z.object({
    studentId: z.string().min(1, "Student ID is required"),
    marksObtained: z.number().min(0, "Marks cannot be negative"),
    remarks: z.string().optional(),
  })),
});

// ─────────────────────────────────────────────
// GET /api/exams/[id]/results — Get exam results
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
  const { searchParams } = new URL(req.url);
  const examSubjectId = searchParams.get("examSubjectId");
  const studentId = searchParams.get("studentId");

  try {
    const exam = await prisma.exam.findUnique({
      where: { id },
      select: { schoolId: true, isPublished: true },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    if (session.user.role !== "SUPER_ADMIN" && exam.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Students and parents can only see published results
    const canViewUnpublished = ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"].includes(session.user.role as UserRole);
    if (!exam.isPublished && !canViewUnpublished) {
      return NextResponse.json({ error: "Results not yet published" }, { status: 403 });
    }

    const where: Record<string, unknown> = {
      examSubject: { examId: id },
    };

    if (examSubjectId) {
      where.examSubjectId = examSubjectId;
    }

    if (studentId) {
      where.studentId = studentId;
    }

    // For students, only show their own results
    if (session.user.role === "STUDENT") {
      const student = await prisma.student.findFirst({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (!student) {
        return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
      }
      where.studentId = student.id;
    }

    // For parents, only show their children's results
    if (session.user.role === "PARENT") {
      const parent = await prisma.parent.findFirst({
        where: { userId: session.user.id },
        include: {
          StudentParent: { select: { studentId: true } },
        },
      });
      if (!parent) {
        return NextResponse.json({ error: "Parent profile not found" }, { status: 404 });
      }
      where.studentId = { in: parent.StudentParent.map(s => s.studentId) };
    }

    const results = await prisma.examResult.findMany({
      where,
      include: {
        Student: {
          select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
          },
        },
        ExamSubject: {
          include: {
            Subject: { select: { id: true, name: true, code: true } },
            Section: {
              select: {
                id: true,
                name: true,
                Class: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: [{ Student: { firstName: "asc" } }],
    });

    // Transform to lowercase for client compatibility
    const transformed = results.map(r => ({
      ...r,
      student: r.Student,
      examSubject: {
        ...r.ExamSubject,
        subject: r.ExamSubject.Subject,
        section: r.ExamSubject.Section ? {
          ...r.ExamSubject.Section,
          class: r.ExamSubject.Section.Class,
        } : null,
      },
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("[GET /api/exams/[id]/results]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// POST /api/exams/[id]/results — Enter/update results (bulk)
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
    const data = bulkResultsSchema.parse(body);

    // Verify exam exists and user has access
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

    // Verify exam subject belongs to this exam
    const examSubject = await prisma.examSubject.findFirst({
      where: { id: data.examSubjectId, examId: id },
      select: { id: true, maxMarks: true, passMark: true },
    });

    if (!examSubject) {
      return NextResponse.json({ error: "Exam subject not found" }, { status: 404 });
    }

    // Process results in a transaction
    const results = await prisma.$transaction(
      data.results.map((result) =>
        prisma.examResult.upsert({
          where: {
            examSubjectId_studentId: {
              examSubjectId: data.examSubjectId,
              studentId: result.studentId,
            },
          },
          update: {
            marksObtained: result.marksObtained,
            grade: calculateGrade(result.marksObtained, examSubject.maxMarks),
            remarks: result.remarks,
            updatedAt: new Date(),
          },
          create: {
            id: randomUUID(),
            examSubjectId: data.examSubjectId,
            studentId: result.studentId,
            marksObtained: result.marksObtained,
            grade: calculateGrade(result.marksObtained, examSubject.maxMarks),
            remarks: result.remarks,
            updatedAt: new Date(),
          },
          include: {
            Student: {
              select: { id: true, studentId: true, firstName: true, lastName: true },
            },
          },
        })
      )
    );

    // Transform results for client compatibility
    const transformedResults = results.map(r => ({
      ...r,
      student: r.Student,
    }));

    return NextResponse.json({ success: true, count: results.length, results: transformedResults });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    console.error("[POST /api/exams/[id]/results]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
