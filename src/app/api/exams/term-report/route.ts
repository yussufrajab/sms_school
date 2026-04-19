import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

// Helper: Calculate overall grade
function getOverallGrade(percentage: number): string {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "F";
}

// ─────────────────────────────────────────────
// GET /api/exams/term-report — Get student's or class term report
// ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");
  const sectionId = searchParams.get("sectionId");
  const academicYearId = searchParams.get("academicYearId");
  const termId = searchParams.get("termId");

  if (!academicYearId || !termId) {
    return NextResponse.json({ error: "Missing academicYearId or termId" }, { status: 400 });
  }

  if (!studentId && !sectionId) {
    return NextResponse.json({ error: "Either studentId or sectionId is required" }, { status: 400 });
  }

  // If sectionId is provided, get class term report
  if (sectionId) {
    return getClassTermReport(sectionId, academicYearId, termId);
  }

  // Otherwise get individual student report
  return getStudentTermReport(studentId!, academicYearId, termId);
}

async function getStudentTermReport(studentId: string, academicYearId: string, termId: string) {
  try {
    // Get student details
    const student = await prisma.student.findUnique({
      where: { id: studentId },
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
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Get academic year and term
    const [academicYear, term] = await Promise.all([
      prisma.academicYear.findUnique({
        where: { id: academicYearId },
        select: { id: true, name: true },
      }),
      prisma.term.findUnique({
        where: { id: termId },
        select: { id: true, name: true },
      }),
    ]);

    if (!academicYear || !term) {
      return NextResponse.json({ error: "Academic year or term not found" }, { status: 404 });
    }

    // Get all exams for this term
    const exams = await prisma.exam.findMany({
      where: {
        academicYearId,
        termId,
      },
      select: {
        id: true,
        name: true,
        isPublished: true,
      },
    });

    if (exams.length === 0) {
      return NextResponse.json({ error: "No exams found for this term" }, { status: 404 });
    }

    // Get exam subjects for all exams
    const examSubjects = await prisma.examSubject.findMany({
      where: {
        examId: { in: exams.map((e) => e.id) },
        sectionId: student.Section?.id,
      },
      include: {
        Subject: { select: { id: true, name: true, code: true } },
      },
    });

    // Get results for this student
    const results = await prisma.examResult.findMany({
      where: {
        studentId,
        examSubjectId: { in: examSubjects.map((es) => es.id) },
      },
    });

    // Build report for each exam
    const examReports = exams.map((exam) => {
      const subjectsForExam = examSubjects.filter((es) => es.examId === exam.id);
      const resultsForExam = results.filter((r) =>
        subjectsForExam.some((es) => es.id === r.examSubjectId)
      );

      let totalMarks = 0;
      let totalMaxMarks = 0;
      let passed = 0;
      let failed = 0;

      const subjectResults = subjectsForExam.map((es) => {
        const result = resultsForExam.find((r) => r.examSubjectId === es.id);
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

      return {
        id: exam.id,
        name: exam.name,
        subjects: subjectResults,
        summary: {
          totalMarks,
          totalMaxMarks,
          percentage: percentage.toFixed(2),
          overallGrade: getOverallGrade(percentage),
        },
      };
    });

    // Calculate overall summary
    let overallTotalMarks = 0;
    let overallTotalMaxMarks = 0;
    let overallPassed = 0;
    let overallFailed = 0;

    examReports.forEach((exam) => {
      overallTotalMarks += exam.summary.totalMarks;
      overallTotalMaxMarks += exam.summary.totalMaxMarks;
      overallPassed += exam.subjects.filter((s) => s.status === "PASS").length;
      overallFailed += exam.subjects.filter((s) => s.status === "FAIL").length;
    });

    const overallAverage = overallTotalMaxMarks > 0 ? (overallTotalMarks / overallTotalMaxMarks) * 100 : 0;

    const termReport = {
      student: {
        id: student.id,
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        section: student.Section
          ? {
              id: student.Section.id,
              name: student.Section.name,
              class: student.Section.Class,
            }
          : null,
      },
      academicYear,
      term,
      exams: examReports,
      overallSummary: {
        totalMarks: overallTotalMarks,
        totalMaxMarks: overallTotalMaxMarks,
        averagePercentage: overallAverage.toFixed(2),
        overallGrade: getOverallGrade(overallAverage),
        totalPassed: overallPassed,
        totalFailed: overallFailed,
      },
    };

    return NextResponse.json(termReport);
  } catch (error) {
    console.error("[GET /api/exams/term-report]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function getClassTermReport(sectionId: string, academicYearId: string, termId: string) {
  try {
    // Get section with class info
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: {
        Class: { select: { id: true, name: true, level: true } },
      },
    });

    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    // Get academic year and term
    const [academicYear, term] = await Promise.all([
      prisma.academicYear.findUnique({
        where: { id: academicYearId },
        select: { id: true, name: true },
      }),
      prisma.term.findUnique({
        where: { id: termId },
        select: { id: true, name: true },
      }),
    ]);

    if (!academicYear || !term) {
      return NextResponse.json({ error: "Academic year or term not found" }, { status: 404 });
    }

    // Get all exams for this term
    const exams = await prisma.exam.findMany({
      where: {
        academicYearId,
        termId,
      },
      select: {
        id: true,
        name: true,
        isPublished: true,
      },
    });

    if (exams.length === 0) {
      return NextResponse.json({ error: "No exams found for this term" }, { status: 404 });
    }

    // Get all students in this section
    const students = await prisma.student.findMany({
      where: { sectionId, status: "ACTIVE" },
      select: {
        id: true,
        studentId: true,
        firstName: true,
        lastName: true,
      },
      orderBy: [{ firstName: "asc" }],
    });

    // Get exam subjects for this section
    const examSubjects = await prisma.examSubject.findMany({
      where: {
        examId: { in: exams.map((e) => e.id) },
        sectionId,
      },
      include: {
        Subject: { select: { id: true, name: true, code: true } },
      },
    });

    // Get all results for students in this section
    const results = await prisma.examResult.findMany({
      where: {
        studentId: { in: students.map((s) => s.id) },
        examSubjectId: { in: examSubjects.map((es) => es.id) },
      },
    });

    // Build student reports
    const studentReports = students.map((student) => {
      // Build report for each exam
      const examReports = exams.map((exam) => {
        const subjectsForExam = examSubjects.filter((es) => es.examId === exam.id);
        const resultsForExam = results.filter(
          (r) => r.studentId === student.id && subjectsForExam.some((es) => es.id === r.examSubjectId)
        );

        let totalMarks = 0;
        let totalMaxMarks = 0;
        let passed = 0;
        let failed = 0;

        const subjectResults = subjectsForExam.map((es) => {
          const result = resultsForExam.find((r) => r.examSubjectId === es.id);
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

        return {
          id: exam.id,
          name: exam.name,
          subjects: subjectResults,
          summary: {
            totalMarks,
            totalMaxMarks,
            percentage: percentage.toFixed(2),
            overallGrade: getOverallGrade(percentage),
          },
        };
      });

      // Calculate overall summary for this student
      let overallTotalMarks = 0;
      let overallTotalMaxMarks = 0;
      let overallPassed = 0;
      let overallFailed = 0;

      examReports.forEach((exam) => {
        overallTotalMarks += exam.summary.totalMarks;
        overallTotalMaxMarks += exam.summary.totalMaxMarks;
        overallPassed += exam.subjects.filter((s) => s.status === "PASS").length;
        overallFailed += exam.subjects.filter((s) => s.status === "FAIL").length;
      });

      const overallAverage = overallTotalMaxMarks > 0 ? (overallTotalMarks / overallTotalMaxMarks) * 100 : 0;

      return {
        student: {
          id: student.id,
          studentId: student.studentId,
          firstName: student.firstName,
          lastName: student.lastName,
          section: {
            id: section.id,
            name: section.name,
            class: section.Class,
          },
        },
        exams: examReports,
        overallSummary: {
          totalMarks: overallTotalMarks,
          totalMaxMarks: overallTotalMaxMarks,
          averagePercentage: overallAverage.toFixed(2),
          overallGrade: getOverallGrade(overallAverage),
          totalPassed: overallPassed,
          totalFailed: overallFailed,
        },
      };
    });

    // Sort by percentage descending and add ranks
    studentReports.sort((a, b) =>
      parseFloat(b.overallSummary.averagePercentage) - parseFloat(a.overallSummary.averagePercentage)
    );
    studentReports.forEach((report, idx) => {
      (report.overallSummary as Record<string, unknown>).rank = idx + 1;
    });

    // Calculate class statistics
    const classStats = {
      totalStudents: studentReports.length,
      averagePercentage: studentReports.length > 0
        ? (studentReports.reduce((sum, r) => sum + parseFloat(r.overallSummary.averagePercentage), 0) / studentReports.length).toFixed(2)
        : "0.00",
      gradeDistribution: {
        "A+": studentReports.filter((r) => r.overallSummary.overallGrade === "A+").length,
        "A": studentReports.filter((r) => r.overallSummary.overallGrade === "A").length,
        "B+": studentReports.filter((r) => r.overallSummary.overallGrade === "B+").length,
        "B": studentReports.filter((r) => r.overallSummary.overallGrade === "B").length,
        "C": studentReports.filter((r) => r.overallSummary.overallGrade === "C").length,
        "D": studentReports.filter((r) => r.overallSummary.overallGrade === "D").length,
        "F": studentReports.filter((r) => r.overallSummary.overallGrade === "F").length,
      },
      passCount: studentReports.filter((r) => r.overallSummary.totalFailed === 0 && r.overallSummary.totalPassed > 0).length,
      failCount: studentReports.filter((r) => r.overallSummary.totalFailed > 0 || r.overallSummary.totalPassed === 0).length,
    };

    return NextResponse.json({
      section: {
        id: section.id,
        name: section.name,
        class: section.Class,
      },
      academicYear,
      term,
      students: studentReports,
      classStats,
    });
  } catch (error) {
    console.error("[GET /api/exams/term-report class]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}