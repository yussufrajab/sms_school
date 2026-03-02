import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

// ─────────────────────────────────────────────
// GET /api/exams/[id]/report — Generate report card
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
  const studentId = searchParams.get("studentId");
  const sectionId = searchParams.get("sectionId");

  try {
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        AcademicYear: { select: { id: true, name: true } },
        Term: { select: { id: true, name: true } },
      },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    if (session.user.role !== "SUPER_ADMIN" && exam.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if results are published for non-staff
    const canViewUnpublished = ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"].includes(session.user.role as UserRole);
    if (!exam.isPublished && !canViewUnpublished) {
      return NextResponse.json({ error: "Results not yet published" }, { status: 403 });
    }

    // Determine which students to include
    let studentIds: string[] | null = null;

    if (studentId) {
      // Single student report
      studentIds = [studentId];
    } else if (session.user.role === "STUDENT") {
      // Student viewing their own report
      const student = await prisma.student.findFirst({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (!student) {
        return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
      }
      studentIds = [student.id];
    } else if (session.user.role === "PARENT") {
      // Parent viewing children's reports
      const parent = await prisma.parent.findFirst({
        where: { userId: session.user.id },
        include: { StudentParent: { select: { studentId: true } } },
      });
      if (!parent) {
        return NextResponse.json({ error: "Parent profile not found" }, { status: 404 });
      }
      studentIds = parent.StudentParent.map(s => s.studentId);
    }

    // Build query for exam subjects
    const examSubjectWhere: Record<string, unknown> = { examId: id };
    if (sectionId) {
      examSubjectWhere.sectionId = sectionId;
    }

    // Get exam subjects
    const examSubjects = await prisma.examSubject.findMany({
      where: examSubjectWhere,
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
      orderBy: { Subject: { name: "asc" } },
    });

    if (examSubjects.length === 0) {
      return NextResponse.json({ error: "No subjects found for this exam" }, { status: 404 });
    }

    // Get results
    const resultsWhere: Record<string, unknown> = {
      examSubjectId: { in: examSubjects.map(es => es.id) },
    };
    if (studentIds) {
      resultsWhere.studentId = { in: studentIds };
    }

    const results = await prisma.examResult.findMany({
      where: resultsWhere,
      include: {
        Student: {
          select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
            Section: {
              select: {
                id: true,
                name: true,
                Class: { select: { id: true, name: true, level: true } },
              },
            },
          },
        },
      },
    });

    // Get all students in section if no specific student
    let students: Array<{
      id: string;
      studentId: string;
      firstName: string;
      lastName: string;
      section: { id: string; name: string; class: { id: string; name: string; level: number } } | null;
    }> = [];

    if (studentIds) {
      students = results
        .filter((r, idx, arr) => arr.findIndex(x => x.Student.id === r.Student.id) === idx)
        .map(r => ({
          id: r.Student.id,
          studentId: r.Student.studentId,
          firstName: r.Student.firstName,
          lastName: r.Student.lastName,
          section: r.Student.Section ? {
            id: r.Student.Section.id,
            name: r.Student.Section.name,
            class: r.Student.Section.Class,
          } : null,
        }));
    } else if (sectionId) {
      const sectionStudents = await prisma.student.findMany({
        where: { sectionId, status: "ACTIVE" },
        select: {
          id: true,
          studentId: true,
          firstName: true,
          lastName: true,
          Section: {
            select: {
              id: true,
              name: true,
              Class: { select: { id: true, name: true, level: true } },
            },
          },
        },
        orderBy: [{ firstName: "asc" }],
      });
      students = sectionStudents.map(s => ({
        id: s.id,
        studentId: s.studentId,
        firstName: s.firstName,
        lastName: s.lastName,
        section: s.Section ? {
          id: s.Section.id,
          name: s.Section.name,
          class: s.Section.Class,
        } : null,
      }));
    }

    // Calculate statistics for each student
    const reportCards = students
      .filter(student => student.section !== null)
      .map(student => {
      const studentResults = results.filter(r => r.studentId === student.id);
      
      let totalMarks = 0;
      let totalMaxMarks = 0;
      let passed = 0;
      let failed = 0;

      const subjectResults = examSubjects.map(es => {
        const result = studentResults.find(r => r.examSubjectId === es.id);
        const marks = result?.marksObtained ?? null;
        const grade = result?.grade ?? null;
        const isPassed = marks !== null && marks >= es.passMark;

        if (marks !== null) {
          totalMarks += marks;
          totalMaxMarks += es.maxMarks;
          if (isPassed) passed++;
          else failed++;
        }

        return {
          subject: es.Subject,
          maxMarks: es.maxMarks,
          passMark: es.passMark,
          marksObtained: marks,
          grade,
          status: marks === null ? "ABSENT" : isPassed ? "PASS" : "FAIL",
        };
      });

      const percentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;
      const overallGrade = getOverallGrade(percentage);

      return {
        student: {
          ...student,
          section: student.section!, // We filtered out nulls above
        },
        exam: {
          id: exam.id,
          name: exam.name,
          AcademicYear: exam.AcademicYear,
          Term: exam.Term,
        },
        subjects: subjectResults,
        summary: {
          totalMarks,
          totalMaxMarks,
          percentage: percentage.toFixed(2),
          overallGrade,
          passed,
          failed,
          status: failed === 0 && passed > 0 ? "PASS" : "FAIL",
          rank: 0, // Will be set after sorting
        },
      };
    });

    // Sort by percentage descending
    reportCards.sort((a, b) => parseFloat(b.summary.percentage) - parseFloat(a.summary.percentage));

    // Add rank
    reportCards.forEach((card, idx) => {
      card.summary.rank = idx + 1;
    });

    return NextResponse.json({
      exam: {
        id: exam.id,
        name: exam.name,
        AcademicYear: exam.AcademicYear,
        Term: exam.Term,
        isPublished: exam.isPublished,
      },
      reportCards,
    });
  } catch (error) {
    console.error("[GET /api/exams/[id]/report]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// Helper: Calculate overall grade
// ─────────────────────────────────────────────

function getOverallGrade(percentage: number): string {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "F";
}
