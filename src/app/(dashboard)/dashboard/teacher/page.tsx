import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TeacherDashboard } from "@/components/dashboard/teacher-dashboard";

export default async function TeacherDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Get staff info
  const staff = await prisma.staff.findUnique({
    where: { userId: session.user.id },
    include: {
      TeachingAssignment: {
        include: {
          Subject: true,
          Section: {
            include: { Class: true, Student: true },
          },
        },
      },
    },
  });

  if (!staff) {
    redirect("/login");
  }

  // Get today's day of week (1=Monday, 7=Sunday)
  const today = new Date();
  const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();

  // Get today's schedule
  const todaySchedule = await prisma.timetable.findMany({
    where: {
      staffId: staff.id,
      dayOfWeek,
    },
    include: {
      Subject: true,
      Section: { include: { Class: true } },
    },
    orderBy: { periodNo: "asc" },
  });

  // Get pending assignments (assignments with submissions to grade)
  const pendingAssignments = await prisma.assignment.findMany({
    where: {
      staffId: staff.id,
      AssignmentSubmission: {
        some: { marks: null },
      },
    },
    include: {
      Subject: true,
      Section: { include: { Class: true } },
      _count: { select: { AssignmentSubmission: true } },
    },
    take: 5,
  });

  // Get recent submissions
  const recentSubmissions = await prisma.assignmentSubmission.findMany({
    where: {
      Assignment: { staffId: staff.id },
    },
    include: {
      Student: true,
      Assignment: { include: { Subject: true } },
    },
    orderBy: { submittedAt: "desc" },
    take: 5,
  });

  // Get attendance marked today
  const attendanceToday = await prisma.studentAttendance.groupBy({
    by: ["sectionId"],
    where: {
      date: today,
      sectionId: { in: staff.TeachingAssignment.map(ta => ta.sectionId) },
    },
    _count: true,
  });

  const totalClasses = staff.TeachingAssignment.length;
  const markedClasses = attendanceToday.length;

  const dashboardData = {
    assignedClasses: staff.TeachingAssignment.map(ta => ({
      id: ta.id,
      name: ta.Section.Class.name,
      section: ta.Section.name,
      subject: ta.Subject.name,
      studentCount: ta.Section.Student.length,
    })),
    todaySchedule: todaySchedule.map(s => ({
      id: s.id,
      period: s.periodNo,
      subject: s.Subject.name,
      class: s.Section.Class.name,
      section: s.Section.name,
      time: `${s.startTime} - ${s.endTime}`,
    })),
    pendingAssignments: pendingAssignments.map(a => ({
      id: a.id,
      title: a.title,
      class: `${a.Section.Class.name} - ${a.Section.name}`,
      dueDate: a.dueDate.toLocaleDateString(),
      submissions: a._count.AssignmentSubmission,
      total: 0, // Would need to count total students in section
    })),
    attendanceToday: {
      marked: markedClasses,
      total: totalClasses,
    },
    recentSubmissions: recentSubmissions.map(s => ({
      id: s.id,
      student: s.Student.firstName + " " + s.Student.lastName,
      assignment: s.Assignment.title,
      submittedAt: s.submittedAt.toLocaleString(),
      status: s.isLate ? "late" : "on-time",
    })),
  };

  return <TeacherDashboard user={session.user} data={dashboardData} />;
}
