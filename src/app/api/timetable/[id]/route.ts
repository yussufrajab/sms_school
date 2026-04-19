import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

// ─────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────

const updateTimetableSchema = z.object({
  subjectId: z.string().min(1, "Subject is required").optional(),
  staffId: z.string().min(1, "Teacher is required").optional(),
  dayOfWeek: z.number().min(1).max(7, "Day must be 1-7 (Mon-Sun)").optional(),
  periodNo: z.number().min(1).max(10, "Period must be 1-10").optional(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format").optional(),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format").optional(),
  classroom: z.string().optional(),
});

// ─────────────────────────────────────────────
// GET /api/timetable/[id] — Get single entry
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
    const entry = await prisma.timetable.findUnique({
      where: { id },
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
    });

    if (!entry) {
      return NextResponse.json({ error: "Timetable entry not found" }, { status: 404 });
    }

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

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("[GET /api/timetable/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// PUT /api/timetable/[id] — Update entry
// ─────────────────────────────────────────────

export async function PUT(
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
    const existing = await prisma.timetable.findUnique({
      where: { id },
      include: { Section: { include: { Class: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Timetable entry not found" }, { status: 404 });
    }

    // Verify school access
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      if (existing.Section.Class.schoolId !== session.user.schoolId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await req.json();
    const data = updateTimetableSchema.parse(body);

    // Verify subject if provided
    if (data.subjectId && session.user.schoolId) {
      const subject = await prisma.subject.findFirst({
        where: { id: data.subjectId, schoolId: session.user.schoolId },
      });
      if (!subject) {
        return NextResponse.json({ error: "Subject not found" }, { status: 404 });
      }
    }

    // Verify staff if provided
    if (data.staffId && session.user.schoolId) {
      const staff = await prisma.staff.findFirst({
        where: { id: data.staffId, schoolId: session.user.schoolId },
      });
      if (!staff) {
        return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
      }
    }

    // Check for conflicts if day/period/staff changed
    const dayOfWeek = data.dayOfWeek ?? existing.dayOfWeek;
    const periodNo = data.periodNo ?? existing.periodNo;
    const staffId = data.staffId ?? existing.staffId;

    // Section conflict
    const sectionConflict = await prisma.timetable.findFirst({
      where: {
        id: { not: id },
        sectionId: existing.sectionId,
        dayOfWeek,
        periodNo,
      },
    });

    if (sectionConflict) {
      return NextResponse.json(
        { error: "This period is already scheduled for this section" },
        { status: 400 }
      );
    }

    // Teacher conflict
    const teacherConflict = await prisma.timetable.findFirst({
      where: {
        id: { not: id },
        staffId,
        dayOfWeek,
        periodNo,
      },
    });

    if (teacherConflict) {
      return NextResponse.json(
        { error: "This teacher is already assigned to another class at this time" },
        { status: 400 }
      );
    }

    const entry = await prisma.timetable.update({
      where: { id },
      data: {
        subjectId: data.subjectId,
        staffId: data.staffId,
        dayOfWeek: data.dayOfWeek,
        periodNo: data.periodNo,
        startTime: data.startTime,
        endTime: data.endTime,
        classroom: data.classroom,
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

    return NextResponse.json(transformed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[PUT /api/timetable/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// DELETE /api/timetable/[id] — Delete entry
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
    const existing = await prisma.timetable.findUnique({
      where: { id },
      include: { Section: { include: { Class: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Timetable entry not found" }, { status: 404 });
    }

    // Verify school access
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      if (existing.Section.Class.schoolId !== session.user.schoolId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    await prisma.timetable.delete({ where: { id } });

    return NextResponse.json({ message: "Timetable entry deleted successfully" });
  } catch (error) {
    console.error("[DELETE /api/timetable/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
