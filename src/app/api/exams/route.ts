import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

// ─────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────

const createExamSchema = z.object({
  name: z.string().min(1, "Exam name is required"),
  academicYearId: z.string().min(1, "Academic year is required"),
  termId: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

// ─────────────────────────────────────────────
// GET /api/exams — List exams
// ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const academicYearId = searchParams.get("academicYearId");
  const termId = searchParams.get("termId");
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));

  const where: Record<string, unknown> = {};

  // Scope to school
  if (session.user.schoolId && session.user.role !== "SUPER_ADMIN") {
    where.schoolId = session.user.schoolId;
  }

  if (academicYearId) {
    where.academicYearId = academicYearId;
  }

  if (termId) {
    where.termId = termId;
  }

  if (search) {
    where.name = { contains: search, mode: "insensitive" };
  }

  try {
    const [exams, total] = await Promise.all([
      prisma.exam.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ startDate: "desc" }],
        include: {
          AcademicYear: {
            select: { id: true, name: true },
          },
          Term: {
            select: { id: true, name: true },
          },
          _count: {
            select: { ExamSubject: true },
          },
        },
      }),
      prisma.exam.count({ where }),
    ]);

    // Transform for client
    const transformedExams = exams.map((e) => ({
      ...e,
      academicYear: e.AcademicYear,
      term: e.Term,
      _count: { examSubjects: e._count.ExamSubject },
    }));

    return NextResponse.json({
      data: transformedExams,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/exams]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// POST /api/exams — Create exam
// ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles: UserRole[] = ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"];
  if (!allowedRoles.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = createExamSchema.parse(body);

    // Verify academic year belongs to user's school
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        id: data.academicYearId,
        schoolId: session.user.schoolId!,
      },
    });

    if (!academicYear) {
      return NextResponse.json({ error: "Academic year not found" }, { status: 404 });
    }

    // Verify term if provided
    if (data.termId) {
      const term = await prisma.term.findFirst({
        where: {
          id: data.termId,
          academicYearId: data.academicYearId,
        },
      });

      if (!term) {
        return NextResponse.json({ error: "Term not found" }, { status: 404 });
      }
    }

    const exam = await prisma.exam.create({
      data: {
        id: randomUUID(),
        schoolId: session.user.schoolId,
        academicYearId: data.academicYearId,
        termId: data.termId,
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        updatedAt: new Date(),
      },
      include: {
        AcademicYear: { select: { id: true, name: true } },
        Term: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      ...exam,
      academicYear: exam.AcademicYear,
      term: exam.Term,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    console.error("[POST /api/exams]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
