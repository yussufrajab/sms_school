import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

// ─────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────

const attendanceRecordSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
  remarks: z.string().optional(),
});

const markAttendanceSchema = z.object({
  date: z.string().min(1, "Date is required"),
  sectionId: z.string().min(1, "Section ID is required"),
  records: z
    .array(attendanceRecordSchema)
    .min(1, "At least one attendance record is required"),
});

// ─────────────────────────────────────────────
// GET /api/attendance — Fetch attendance records
// Filters: date, sectionId, studentId, academicYearId
// ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const sectionId = searchParams.get("sectionId");
  const studentId = searchParams.get("studentId");
  const academicYearId = searchParams.get("academicYearId");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "50")));

  // Build filter — scope to school for non-super-admins
  const where: Record<string, unknown> = {};

  if (date) {
    // Match the full day by using a date range
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setUTCHours(23, 59, 59, 999);
    where.date = { gte: start, lte: end };
  }

  if (sectionId) where.sectionId = sectionId;
  if (studentId) where.studentId = studentId;
  if (academicYearId) where.academicYearId = academicYearId;

  // Scope to school via section → class → school
  if (session.user.schoolId && session.user.role !== "SUPER_ADMIN") {
    where.Section = { Class: { schoolId: session.user.schoolId } };
  }

  // Teachers can only see attendance for sections they teach
  if (session.user.role === "TEACHER") {
    const staffRecord = await prisma.staff.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!staffRecord) {
      return NextResponse.json({ error: "Staff record not found" }, { status: 404 });
    }

    const assignedSections = await prisma.teachingAssignment.findMany({
      where: { staffId: staffRecord.id },
      select: { sectionId: true },
    });

    const sectionIds = assignedSections.map((a: { sectionId: string }) => a.sectionId);

    if (sectionId && !sectionIds.includes(sectionId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!sectionId) {
      where.sectionId = { in: sectionIds };
    }
  }

  try {
    const [records, total] = await Promise.all([
      prisma.studentAttendance.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ date: "desc" }, { createdAt: "asc" }],
        include: {
          Student: {
            select: {
              id: true,
              studentId: true,
              firstName: true,
              lastName: true,
              photoUrl: true,
            },
          },
          Section: {
            select: {
              id: true,
              name: true,
              Class: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.studentAttendance.count({ where }),
    ]);

    return NextResponse.json({
      data: records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/attendance]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// POST /api/attendance — Mark / update attendance for a section
// ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles: UserRole[] = ["TEACHER", "SCHOOL_ADMIN", "SUPER_ADMIN"];
  if (!allowedRoles.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = markAttendanceSchema.parse(body);

    // Prevent marking attendance for future dates
    const attendanceDate = new Date(data.date);
    attendanceDate.setUTCHours(0, 0, 0, 0);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (attendanceDate > today) {
      return NextResponse.json(
        { error: "Cannot mark attendance for a future date" },
        { status: 400 }
      );
    }

    // Verify section exists and belongs to the correct school
    const section = await prisma.section.findUnique({
      where: { id: data.sectionId },
      include: { Class: { select: { schoolId: true } } },
    });

    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    if (
      session.user.role !== "SUPER_ADMIN" &&
      section.Class.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Teachers can only mark attendance for sections they are assigned to
    if (session.user.role === "TEACHER") {
      const staffRecord = await prisma.staff.findFirst({
        where: { userId: session.user.id },
        select: { id: true },
      });

      if (!staffRecord) {
        return NextResponse.json({ error: "Staff record not found" }, { status: 404 });
      }

      const assignment = await prisma.teachingAssignment.findFirst({
        where: { staffId: staffRecord.id, sectionId: data.sectionId },
      });

      if (!assignment) {
        return NextResponse.json(
          { error: "You are not assigned to this section" },
          { status: 403 }
        );
      }
    }

    // Resolve the current academic year for the school
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        schoolId: section.Class.schoolId,
        isCurrent: true,
      },
      select: { id: true },
    });

    if (!academicYear) {
      return NextResponse.json(
        { error: "No active academic year found for this school" },
        { status: 400 }
      );
    }

    // Validate that all studentIds belong to this section
    const studentIds = data.records.map((r) => r.studentId);
    const studentsInSection = await prisma.student.findMany({
      where: { id: { in: studentIds }, sectionId: data.sectionId },
      select: { id: true },
    });

    const validStudentIds = new Set(studentsInSection.map((s: { id: string }) => s.id));
    const invalidIds = studentIds.filter((sid: string) => !validStudentIds.has(sid));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        {
          error: "Some students do not belong to this section",
          invalidStudentIds: invalidIds,
        },
        { status: 400 }
      );
    }

    // Upsert each attendance record within a transaction
    const results = await prisma.$transaction(
      data.records.map((record) =>
        prisma.studentAttendance.upsert({
          where: {
            studentId_date: {
              studentId: record.studentId,
              date: attendanceDate,
            },
          },
          create: {
            id: randomUUID(),
            studentId: record.studentId,
            sectionId: data.sectionId,
            academicYearId: academicYear.id,
            date: attendanceDate,
            status: record.status,
            remarks: record.remarks,
            markedBy: session.user.id,
            updatedAt: new Date(),
          },
          update: {
            status: record.status,
            remarks: record.remarks,
            markedBy: session.user.id,
            sectionId: data.sectionId,
            updatedAt: new Date(),
          },
        })
      )
    );

    return NextResponse.json(
      {
        message: "Attendance recorded successfully",
        date: data.date,
        sectionId: data.sectionId,
        count: results.length,
        records: results,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[POST /api/attendance]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
