import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

// ─────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────

const createTimetableSchema = z.object({
  sectionId: z.string().min(1, "Section is required"),
  subjectId: z.string().min(1, "Subject is required"),
  staffId: z.string().min(1, "Teacher is required"),
  dayOfWeek: z.number().min(1).max(7, "Day must be 1-7 (Mon-Sun)"),
  periodNo: z.number().min(1).max(10, "Period must be 1-10"),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  classroom: z.string().optional(),
});

// ─────────────────────────────────────────────
// GET /api/timetable — List timetable entries
// ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sectionId = searchParams.get("sectionId");
  const staffId = searchParams.get("staffId");
  const dayOfWeek = searchParams.get("dayOfWeek");

  try {
    const where: Record<string, unknown> = {};

    if (sectionId) where.sectionId = sectionId;
    if (staffId) where.staffId = staffId;
    if (dayOfWeek) where.dayOfWeek = parseInt(dayOfWeek);

    // Scope to school for non-super-admins
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      where.Section = { Class: { schoolId: session.user.schoolId } };
    }

    // For students, show only their section's timetable
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

    // For teachers, can view their own schedule
    if (session.user.role === "TEACHER" && !staffId) {
      const staff = await prisma.staff.findFirst({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (staff) {
        where.staffId = staff.id;
      }
    }

    const entries = await prisma.timetable.findMany({
      where,
      include: {
        Section: {
          select: {
            id: true,
            name: true,
            Class: { select: { id: true, name: true } },
          },
        },
        Subject: {
          select: { id: true, name: true, code: true },
        },
        Staff: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: [{ dayOfWeek: "asc" }, { periodNo: "asc" }],
    });

    // Transform to lowercase for client compatibility
    const transformed = entries.map((e) => ({
      ...e,
      section: {
        ...e.Section,
        class: e.Section.Class,
      },
      subject: e.Subject,
      staff: e.Staff,
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("[GET /api/timetable]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// POST /api/timetable — Create timetable entry
// ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles: UserRole[] = ["SUPER_ADMIN", "SCHOOL_ADMIN"];
  if (!allowedRoles.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!session.user.schoolId) {
    return NextResponse.json({ error: "School not found" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const data = createTimetableSchema.parse(body);

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

    // Verify staff belongs to school
    const staff = await prisma.staff.findFirst({
      where: { id: data.staffId, schoolId: session.user.schoolId },
    });

    if (!staff) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Check for conflicts - same section, day, period
    const sectionConflict = await prisma.timetable.findFirst({
      where: {
        sectionId: data.sectionId,
        dayOfWeek: data.dayOfWeek,
        periodNo: data.periodNo,
      },
    });

    if (sectionConflict) {
      return NextResponse.json(
        { error: "This period is already scheduled for this section" },
        { status: 400 }
      );
    }

    // Check for conflicts - same teacher, day, period
    const teacherConflict = await prisma.timetable.findFirst({
      where: {
        staffId: data.staffId,
        dayOfWeek: data.dayOfWeek,
        periodNo: data.periodNo,
      },
    });

    if (teacherConflict) {
      return NextResponse.json(
        { error: "This teacher is already assigned to another class at this time" },
        { status: 400 }
      );
    }

    const entry = await prisma.timetable.create({
      data: {
        id: randomUUID(),
        sectionId: data.sectionId,
        subjectId: data.subjectId,
        staffId: data.staffId,
        dayOfWeek: data.dayOfWeek,
        periodNo: data.periodNo,
        startTime: data.startTime,
        endTime: data.endTime,
        classroom: data.classroom,
        updatedAt: new Date(),
      },
      include: {
        Section: {
          select: { id: true, name: true, Class: { select: { id: true, name: true } } },
        },
        Subject: { select: { id: true, name: true, code: true } },
        Staff: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Transform to lowercase for client compatibility
    const transformed = {
      ...entry,
      section: {
        ...entry.Section,
        class: entry.Section.Class,
      },
      subject: entry.Subject,
      staff: entry.Staff,
    };

    return NextResponse.json(transformed, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[POST /api/timetable]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
