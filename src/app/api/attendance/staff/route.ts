import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

// ─────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────

const staffAttendanceRecordSchema = z.object({
  staffId: z.string().min(1, "Staff ID is required"),
  status: z.enum(["PRESENT", "ABSENT", "ON_LEAVE", "HALF_DAY"]),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  remarks: z.string().optional(),
});

const markStaffAttendanceSchema = z.object({
  date: z.string().min(1, "Date is required"),
  records: z
    .array(staffAttendanceRecordSchema)
    .min(1, "At least one attendance record is required"),
});

// ─────────────────────────────────────────────
// GET /api/attendance/staff — Fetch staff attendance
// ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const department = searchParams.get("department");

  if (!date) {
    return NextResponse.json({ error: "Date is required" }, { status: 400 });
  }

  // Build filter for staff
  const staffWhere: Record<string, unknown> = {
    isActive: true,
  };

  // Scope to school for non-super-admins
  if (session.user.schoolId && session.user.role !== "SUPER_ADMIN") {
    staffWhere.schoolId = session.user.schoolId;
  }

  if (department && department !== "all") {
    staffWhere.department = department;
  }

  try {
    // Get all staff matching criteria
    const staffList = await prisma.staff.findMany({
      where: staffWhere,
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        department: true,
        designation: true,
        photoUrl: true,
      },
      orderBy: [{ firstName: "asc" }],
    });

    // Get attendance records for the date
    const attendanceDate = new Date(date);
    attendanceDate.setUTCHours(0, 0, 0, 0);

    const attendanceRecords = await prisma.staffAttendance.findMany({
      where: {
        staffId: { in: staffList.map((s) => s.id) },
        date: attendanceDate,
      },
      select: {
        id: true,
        staffId: true,
        date: true,
        checkIn: true,
        checkOut: true,
        status: true,
        remarks: true,
      },
    });

    // Check for approved leave applications
    const leaveApplications = await prisma.leaveApplication.findMany({
      where: {
        staffId: { in: staffList.map((s) => s.id) },
        status: "APPROVED",
        startDate: { lte: attendanceDate },
        endDate: { gte: attendanceDate },
      },
      select: {
        staffId: true,
      },
    });

    const staffOnLeave = new Set(leaveApplications.map((l) => l.staffId));

    // Add onLeave flag to staff
    const staffWithLeave = staffList.map((s) => ({
      ...s,
      onLeave: staffOnLeave.has(s.id),
    }));

    return NextResponse.json({
      staff: staffWithLeave,
      records: attendanceRecords,
    });
  } catch (error) {
    console.error("[GET /api/attendance/staff]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// POST /api/attendance/staff — Mark staff attendance
// ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles: UserRole[] = ["SCHOOL_ADMIN", "SUPER_ADMIN", "RECEPTIONIST", "IT_ADMIN"];
  if (!allowedRoles.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = markStaffAttendanceSchema.parse(body);

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

    // Validate staff IDs belong to the correct school
    const staffIds = data.records.map((r) => r.staffId);
    const staffRecords = await prisma.staff.findMany({
      where: {
        id: { in: staffIds },
        ...(session.user.role !== "SUPER_ADMIN" && session.user.schoolId
          ? { schoolId: session.user.schoolId }
          : {}),
      },
      select: { id: true },
    });

    const validStaffIds = new Set(staffRecords.map((s) => s.id));
    const invalidIds = staffIds.filter((id) => !validStaffIds.has(id));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        {
          error: "Some staff IDs are invalid or do not belong to your school",
          invalidIds,
        },
        { status: 400 }
      );
    }

    // Process each attendance record
    const results = await prisma.$transaction(
      data.records.map((record) => {
        // Parse check-in and check-out times
        let checkIn: Date | null = null;
        let checkOut: Date | null = null;

        if (record.checkIn) {
          const [hours, minutes] = record.checkIn.split(":").map(Number);
          checkIn = new Date(attendanceDate);
          checkIn.setHours(hours, minutes, 0, 0);
        }

        if (record.checkOut) {
          const [hours, minutes] = record.checkOut.split(":").map(Number);
          checkOut = new Date(attendanceDate);
          checkOut.setHours(hours, minutes, 0, 0);
        }

        return prisma.staffAttendance.upsert({
          where: {
            staffId_date: {
              staffId: record.staffId,
              date: attendanceDate,
            },
          },
          create: {
            id: randomUUID(),
            staffId: record.staffId,
            date: attendanceDate,
            status: record.status,
            checkIn,
            checkOut,
            remarks: record.remarks,
            updatedAt: new Date(),
          },
          update: {
            status: record.status,
            checkIn,
            checkOut,
            remarks: record.remarks,
            updatedAt: new Date(),
          },
        });
      })
    );

    return NextResponse.json({
      message: "Staff attendance recorded successfully",
      date: data.date,
      count: results.length,
      records: results,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[POST /api/attendance/staff]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
