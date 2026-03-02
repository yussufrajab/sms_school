import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StudentDashboard } from "@/components/dashboard/student-dashboard";

export default async function StudentDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Get student info
  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    include: {
      Section: { include: { Class: true } },
    },
  });

  if (!student || !student.sectionId) {
    redirect("/login");
  }

  // Get today's day of week
  const today = new Date();
  const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();

  // Get today's schedule
  const todaySchedule = await prisma.timetable.findMany({
    where: {
      sectionId: student.sectionId,
      dayOfWeek,
    },
    include: {
      Subject: true,
      Staff: true,
    },
    orderBy: { periodNo: "asc" },
  });

  // Get upcoming assignments
  const upcomingAssignments = await prisma.assignment.findMany({
    where: {
      sectionId: student.sectionId,
      dueDate: { gte: today },
    },
    include: { Subject: true },
    orderBy: { dueDate: "asc" },
    take: 10,
  });

  // Get student submissions for these assignments
  const submissions = await prisma.assignmentSubmission.findMany({
    where: { studentId: student.id },
    select: { assignmentId: true, marks: true },
  });
  const submittedAssignmentIds = submissions.map(s => s.assignmentId);

  // Get attendance summary
  const attendanceRecords = await prisma.studentAttendance.findMany({
    where: { studentId: student.id },
    select: { status: true },
  });

  const attendanceSummary = {
    present: attendanceRecords.filter(r => r.status === "PRESENT").length,
    absent: attendanceRecords.filter(r => r.status === "ABSENT").length,
    late: attendanceRecords.filter(r => r.status === "LATE").length,
    total: attendanceRecords.length,
    percentage: attendanceRecords.length > 0
      ? Math.round((attendanceRecords.filter(r => r.status === "PRESENT").length / attendanceRecords.length) * 100)
      : 0,
  };

  // Get recent grades
  const recentGrades = await prisma.examResult.findMany({
    where: { studentId: student.id },
    include: {
      ExamSubject: {
        include: { Subject: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // Get fee status
  const invoices = await prisma.invoice.findMany({
    where: { studentId: student.id },
    select: { totalAmount: true, paidAmount: true },
  });

  const feeStatus = {
    totalDue: invoices.reduce((sum, i) => sum + i.totalAmount, 0),
    paid: invoices.reduce((sum, i) => sum + i.paidAmount, 0),
    pending: invoices.reduce((sum, i) => sum + (i.totalAmount - i.paidAmount), 0),
  };

  // Get upcoming events
  const upcomingEvents = await prisma.event.findMany({
    where: {
      schoolId: student.schoolId,
      startDate: { gte: today },
      visibility: { in: ["ALL", "STUDENTS_ONLY"] },
    },
    orderBy: { startDate: "asc" },
    take: 5,
  });

  const dashboardData = {
    classInfo: {
      name: student.Section?.Class.name || "N/A",
      section: student.Section?.name || "N/A",
    },
    todaySchedule: todaySchedule.map(s => ({
      id: s.id,
      period: s.periodNo,
      subject: s.Subject.name,
      time: `${s.startTime} - ${s.endTime}`,
      teacher: s.Staff.firstName + " " + s.Staff.lastName,
    })),
    upcomingAssignments: upcomingAssignments.map(a => {
      const daysLeft = Math.ceil((a.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: a.id,
        title: a.title,
        subject: a.Subject.name,
        dueDate: a.dueDate.toLocaleDateString(),
        daysLeft,
        status: submittedAssignmentIds.includes(a.id) ? "submitted" : "pending",
      };
    }),
    attendanceSummary,
    recentGrades: recentGrades.map(g => ({
      id: g.id,
      subject: g.ExamSubject.Subject.name,
      assignment: "Exam",
      marks: g.marksObtained,
      maxMarks: g.ExamSubject.maxMarks,
      grade: g.grade || "",
    })),
    feeStatus,
    upcomingEvents: upcomingEvents.map(e => ({
      id: e.id,
      title: e.title,
      date: e.startDate.toLocaleDateString(),
      type: e.category,
    })),
  };

  return <StudentDashboard user={session.user} data={dashboardData} />;
}
