import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";

// ─────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────

const createAssignmentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  subjectId: z.string().min(1, "Subject is required"),
  sectionId: z.string().min(1, "Section is required"),
  dueDate: z.string().min(1, "Due date is required"),
  maxMarks: z.number().positive("Max marks must be positive").default(100),
  allowLate: z.boolean().default(false),
  latePenalty: z.number().min(0).max(100).optional(),
  fileUrl: z.string().url().optional().or(z.literal("")),
});

// ─────────────────────────────────────────────
// GET /api/assignments — List assignments
// ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sectionId = searchParams.get("sectionId");
  const subjectId = searchParams.get("subjectId");
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));

  try {
    const where: Record<string, unknown> = {};

    if (sectionId) where.sectionId = sectionId;
    if (subjectId) where.subjectId = subjectId;

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" as const } },
        { description: { contains: search, mode: "insensitive" as const } },
      ];
    }

    // Scope to school for non-super-admins
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      where.Section = { Class: { schoolId: session.user.schoolId } };
    }

    // For students, show only their section's assignments
    if (session.user.role === "STUDENT") {
      const student = await prisma.student.findFirst({
        where: { userId: session.user.id },
        select: { sectionId: true },
      });
      if (!student) {
        return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
      }
      where.sectionId = student.sectionId;
    }

    // For teachers, show only their assignments
    if (session.user.role === "TEACHER") {
      const staff = await prisma.staff.findFirst({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (staff) {
        where.staffId = staff.id;
      }
    }

    const [assignments, total] = await Promise.all([
      prisma.assignment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          Subject: { select: { id: true, name: true, code: true } },
          Section: {
            select: {
              id: true,
              name: true,
              Class: { select: { id: true, name: true } },
            },
          },
          _count: { select: { AssignmentSubmission: true } },
        },
        orderBy: { dueDate: "desc" },
      }),
      prisma.assignment.count({ where }),
    ]);

    // Add submission status for students
    if (session.user.role === "STUDENT") {
      const student = await prisma.student.findFirst({
        where: { userId: session.user.id },
        select: { id: true },
      });

      if (student) {
        const assignmentsWithStatus = await Promise.all(
          assignments.map(async (assignment) => {
            const submission = await prisma.assignmentSubmission.findUnique({
              where: {
                assignmentId_studentId: {
                  assignmentId: assignment.id,
                  studentId: student.id,
                },
              },
              select: { id: true, marks: true, submittedAt: true },
            });

            const now = new Date();
            const dueDate = new Date(assignment.dueDate);
            const isOverdue = now > dueDate && !submission;

            let assignmentStatus = "pending";
            if (submission) {
              assignmentStatus = submission.marks !== null ? "graded" : "submitted";
            } else if (isOverdue) {
              assignmentStatus = "overdue";
            }

            return {
              ...assignment,
              status: assignmentStatus,
              submission,
            };
          })
        );
        return NextResponse.json({
          data: assignmentsWithStatus,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
      }
    }

    return NextResponse.json({
      data: assignments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("[GET /api/assignments]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// POST /api/assignments — Create assignment
// ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!session.user.schoolId) {
    return NextResponse.json({ error: "School not found" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const data = createAssignmentSchema.parse(body);

    // Verify section belongs to school
    const section = await prisma.section.findFirst({
      where: {
        id: data.sectionId,
        Class: { schoolId: session.user.schoolId },
      },
      include: { Class: true },
    });

    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    // Verify subject belongs to school
    const subject = await prisma.subject.findFirst({
      where: { id: data.subjectId, schoolId: session.user.schoolId },
    });

    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    // Get staff ID
    let staffId: string | null = null;
    if (session.user.role === "TEACHER") {
      const staff = await prisma.staff.findFirst({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (!staff) {
        return NextResponse.json({ error: "Staff profile not found" }, { status: 404 });
      }
      staffId = staff.id;
    } else {
      // Admin can assign to any teacher - but for now, use the first available
      // In a real app, you'd have a staffId field in the form
      const staff = await prisma.staff.findFirst({
        where: { schoolId: session.user.schoolId },
        select: { id: true },
      });
      staffId = staff?.id || null;
    }

    if (!staffId) {
      return NextResponse.json({ error: "No teacher available to assign" }, { status: 400 });
    }

    const assignment = await prisma.assignment.create({
      data: {
        id: randomUUID(),
        title: data.title,
        description: data.description,
        subjectId: data.subjectId,
        sectionId: data.sectionId,
        staffId,
        dueDate: new Date(data.dueDate),
        maxMarks: data.maxMarks,
        allowLate: data.allowLate,
        latePenalty: data.latePenalty,
        fileUrl: data.fileUrl || null,
        updatedAt: new Date(),
      },
      include: {
        Subject: { select: { id: true, name: true, code: true } },
        Section: {
          select: { id: true, name: true, Class: { select: { id: true, name: true } } },
        },
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[POST /api/assignments]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
