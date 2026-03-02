import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ParentDashboard } from "@/components/dashboard/parent-dashboard";

export default async function ParentDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Get parent info
  const parent = await prisma.parent.findUnique({
    where: { userId: session.user.id },
    include: {
      StudentParent: {
        include: {
          Student: {
            include: {
              Section: { include: { Class: true } },
            },
          },
        },
      },
    },
  });

  if (!parent) {
    redirect("/login");
  }

  const studentIds = parent.StudentParent.map(s => s.studentId);

  // Get attendance for each child
  const attendanceData = await prisma.studentAttendance.groupBy({
    by: ["studentId"],
    where: { studentId: { in: studentIds } },
    _count: { status: true },
  });

  const presentCounts = await prisma.studentAttendance.groupBy({
    by: ["studentId"],
    where: { studentId: { in: studentIds }, status: "PRESENT" },
    _count: true,
  });

  // Get fee summary
  const invoices = await prisma.invoice.findMany({
    where: { studentId: { in: studentIds } },
    select: { totalAmount: true, paidAmount: true, status: true },
  });

  const feeSummary = {
    totalDue: invoices.reduce((sum, i) => sum + i.totalAmount, 0),
    paid: invoices.reduce((sum, i) => sum + i.paidAmount, 0),
    overdue: invoices.filter(i => i.status === "OVERDUE").reduce((sum, i) => sum + (i.totalAmount - i.paidAmount), 0),
  };

  // Get recent messages
  const recentMessages = await prisma.message.findMany({
    where: { receiverId: session.user.id },
    include: { User_Message_senderIdToUser: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // Get upcoming events
  const upcomingEvents = await prisma.event.findMany({
    where: {
      schoolId: parent.schoolId,
      startDate: { gte: new Date() },
      visibility: { in: ["ALL"] },
    },
    orderBy: { startDate: "asc" },
    take: 5,
  });

  // Get attendance alerts (absent/late in last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const attendanceAlerts = await prisma.studentAttendance.findMany({
    where: {
      studentId: { in: studentIds },
      status: { in: ["ABSENT", "LATE"] },
      date: { gte: thirtyDaysAgo },
    },
    include: { Student: true },
    orderBy: { date: "desc" },
    take: 10,
  });

  // Build children data
  const children = parent.StudentParent.map(s => {
    const studentAttendance = attendanceData.find(a => a.studentId === s.studentId);
    const presentCount = presentCounts.find(p => p.studentId === s.studentId);
    const totalDays = studentAttendance?._count?.status || 0;
    const present = presentCount?._count || 0;
    const percentage = totalDays > 0 ? Math.round((present / totalDays) * 100) : 0;

    return {
      id: s.studentId,
      name: s.Student.firstName + " " + s.Student.lastName,
      class: s.Student.Section?.Class.name || "N/A",
      section: s.Student.Section?.name || "N/A",
      photoUrl: s.Student.photoUrl ?? undefined,
      attendancePercentage: percentage,
      averageGrade: "B+", // Would calculate from exam results
      pendingAssignments: 0, // Would query assignments
    };
  });

  const dashboardData = {
    children,
    feeSummary,
    recentMessages: recentMessages.map(m => ({
      id: m.id,
      from: m.User_Message_senderIdToUser.name || "Unknown",
      subject: m.subject || "No subject",
      date: m.createdAt.toLocaleDateString(),
      unread: !m.isRead,
    })),
    upcomingEvents: upcomingEvents.map(e => ({
      id: e.id,
      title: e.title,
      date: e.startDate.toLocaleDateString(),
      type: e.category,
    })),
    attendanceAlerts: attendanceAlerts.map(a => ({
      id: a.id,
      childName: a.Student.firstName + " " + a.Student.lastName,
      date: a.date.toLocaleDateString(),
      status: a.status,
    })),
  };

  return <ParentDashboard user={session.user} data={dashboardData} />;
}
