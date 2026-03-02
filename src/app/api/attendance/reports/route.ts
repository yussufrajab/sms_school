import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────
// GET /api/attendance/reports — Aggregated attendance data
// Query params: sectionId, academicYearId, startDate, endDate
// ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sectionId = searchParams.get("sectionId");
  const academicYearId = searchParams.get("academicYearId");
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");

  if (!sectionId) {
    return NextResponse.json({ error: "Section ID is required" }, { status: 400 });
  }

  // Verify section belongs to user's school
  const section = await prisma.section.findFirst({
    where: {
      id: sectionId,
      Class: session.user.schoolId ? { schoolId: session.user.schoolId } : undefined,
    },
    include: {
      Class: { select: { schoolId: true } },
    },
  });

  if (!section) {
    return NextResponse.json({ error: "Section not found" }, { status: 404 });
  }

  // Build date filter
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (startDateParam) {
    dateFilter.gte = new Date(startDateParam);
  }
  if (endDateParam) {
    dateFilter.lte = new Date(endDateParam);
  }

  try {
    // Get all students in the section
    const students = await prisma.student.findMany({
      where: {
        sectionId,
        deletedAt: null,
      },
      select: {
        id: true,
        studentId: true,
        firstName: true,
        lastName: true,
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });

    // Build where clause for attendance records
    const where: Record<string, unknown> = {
      sectionId,
      ...(academicYearId ? { academicYearId } : {}),
      ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
    };

    // Get all attendance records for the section
    const attendanceRecords = await prisma.studentAttendance.findMany({
      where,
      select: {
        studentId: true,
        status: true,
        date: true,
      },
    });

    // Process data for student summary
    const studentSummary = students.map((student) => {
      const records = attendanceRecords.filter((r) => r.studentId === student.id);
      const present = records.filter((r) => r.status === "PRESENT").length;
      const absent = records.filter((r) => r.status === "ABSENT").length;
      const late = records.filter((r) => r.status === "LATE").length;
      const excused = records.filter((r) => r.status === "EXCUSED").length;
      const total = records.length;
      const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

      return {
        studentId: student.studentId,
        studentName: `${student.firstName} ${student.lastName}`,
        present,
        absent,
        late,
        excused,
        total,
        percentage,
      };
    });

    // Process data for daily stats
    const dailyMap = new Map<string, { present: number; absent: number; late: number; excused: number }>();

    attendanceRecords.forEach((record) => {
      const dateStr = record.date.toISOString().split("T")[0];
      const existing = dailyMap.get(dateStr) || { present: 0, absent: 0, late: 0, excused: 0 };

      if (record.status === "PRESENT") existing.present++;
      else if (record.status === "ABSENT") existing.absent++;
      else if (record.status === "LATE") existing.late++;
      else if (record.status === "EXCUSED") existing.excused++;

      dailyMap.set(dateStr, existing);
    });

    const dailyStats = Array.from(dailyMap.entries())
      .map(([date, stats]) => ({
        date,
        ...stats,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate overall stats
    const totalPresent = attendanceRecords.filter((r) => r.status === "PRESENT").length;
    const totalAbsent = attendanceRecords.filter((r) => r.status === "ABSENT").length;
    const totalLate = attendanceRecords.filter((r) => r.status === "LATE").length;
    const totalExcused = attendanceRecords.filter((r) => r.status === "EXCUSED").length;
    const totalRecords = attendanceRecords.length;
    const overallPercentage = totalRecords > 0 
      ? Math.round(((totalPresent + totalLate) / totalRecords) * 100) 
      : 0;

    return NextResponse.json({
      summary: studentSummary,
      dailyStats,
      overall: {
        totalStudents: students.length,
        totalPresent,
        totalAbsent,
        totalLate,
        totalExcused,
        totalRecords,
        overallPercentage,
      },
    });
  } catch (error) {
    console.error("[GET /api/attendance/reports]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
