import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Get school ID
  const schoolId = session.user.schoolId;
  if (!schoolId) redirect("/login");
  
  // Fetch dashboard data
  const [
    totalStudents,
    totalStaff,
    totalClasses,
    todayAttendance,
    feeCollection,
    recentActivity,
    upcomingEvents,
  ] = await Promise.all([
    // Total students
    prisma.student.count({
      where: { schoolId: schoolId, status: "ACTIVE" },
    }),
    // Total staff
    prisma.staff.count({
      where: { schoolId: schoolId, isActive: true },
    }),
    // Total classes
    prisma.class.count({
      where: { schoolId: schoolId },
    }),
    // Today's attendance
    prisma.studentAttendance.count({
      where: {
        date: new Date(),
        status: "PRESENT",
      },
    }),
    // Fee collection
    prisma.invoice.aggregate({
      where: { Student: { schoolId } },
      _sum: { totalAmount: true, paidAmount: true },
    }),
    // Recent activity (audit logs)
    prisma.auditLog.findMany({
      where: { schoolId },
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { User: { select: { name: true } } },
    }),
    // Upcoming events
    prisma.event.findMany({
      where: { schoolId, startDate: { gte: new Date() } },
      take: 5,
      orderBy: { startDate: "asc" },
    }),
  ]);

  // Calculate attendance rate
  const totalAttendanceRecords = await prisma.studentAttendance.count({
    where: { date: new Date() },
  });
  const attendanceRate = totalAttendanceRecords > 0
    ? Math.round((todayAttendance / totalAttendanceRecords) * 100)
    : 0;

  // Mock enrollment trend data (would be calculated from actual data)
  const enrollmentTrend = [
    { month: "Aug", students: 450 },
    { month: "Sep", students: 465 },
    { month: "Oct", students: 470 },
    { month: "Nov", students: 475 },
    { month: "Dec", students: 472 },
    { month: "Jan", students: 480 },
  ];

  // Mock attendance data for the week
  const attendanceData = [
    { day: "Mon", present: 450, absent: 20 },
    { day: "Tue", present: 455, absent: 15 },
    { day: "Wed", present: 448, absent: 22 },
    { day: "Thu", present: 452, absent: 18 },
    { day: "Fri", present: 445, absent: 25 },
  ];

  // Alerts
  const alerts = [];
  const lowAttendanceCount = await prisma.student.count({
    where: { schoolId, status: "ACTIVE" },
  });
  if (lowAttendanceCount > 0) {
    alerts.push({ id: "1", message: "Students with low attendance", type: "warning", count: 12 });
  }
  const overdueFees = await prisma.invoice.count({
    where: { Student: { schoolId }, status: "OVERDUE" },
  });
  if (overdueFees > 0) {
    alerts.push({ id: "2", message: "Overdue fee invoices", type: "error", count: overdueFees });
  }

  const dashboardData = {
    stats: {
      totalStudents,
      totalStaff,
      totalClasses,
      attendanceRate,
    },
    enrollmentTrend,
    attendanceData,
    feeCollection: {
      collected: feeCollection._sum.paidAmount || 0,
      pending: (feeCollection._sum.totalAmount || 0) - (feeCollection._sum.paidAmount || 0),
      total: feeCollection._sum.totalAmount || 0,
    },
    recentActivity: recentActivity.map(log => ({
      id: log.id,
      action: log.action,
      user: log.User?.name || "System",
      timestamp: log.createdAt.toLocaleString(),
      type: log.entityType || "system",
    })),
    upcomingEvents: upcomingEvents.map(event => ({
      id: event.id,
      title: event.title,
      date: event.startDate.toLocaleDateString(),
      type: event.category,
    })),
    alerts,
  };

  return <AdminDashboard user={session.user} data={dashboardData} />;
}
