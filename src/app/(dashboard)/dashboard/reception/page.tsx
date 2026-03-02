import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ReceptionistDashboard } from "@/components/dashboard/receptionist-dashboard";

export default async function ReceptionistDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const schoolId = session.user.schoolId;
  if (!schoolId) redirect("/login");

  // Note: Visitor management would need a Visitor model in the schema
  // For now, we'll use placeholder data

  // Get announcements
  const announcements = await prisma.announcement.findMany({
    where: { schoolId, isPublished: true },
    orderBy: { publishedAt: "desc" },
    take: 5,
  });

  // Get upcoming events
  const upcomingEvents = await prisma.event.findMany({
    where: {
      schoolId,
      startDate: { gte: new Date() },
    },
    orderBy: { startDate: "asc" },
    take: 5,
  });

  // Mock data for visitors (would need Visitor model)
  const todayVisitors = [
    { id: "1", name: "John Smith", purpose: "Parent Meeting", checkIn: "9:00 AM", status: "checked_in" },
    { id: "2", name: "Mary Johnson", purpose: "Admission Enquiry", checkIn: "10:30 AM", status: "checked_in" },
    { id: "3", name: "Robert Brown", purpose: "Delivery", checkIn: "11:00 AM", checkOut: "11:30 AM", status: "checked_out" },
  ];

  const appointments = [
    { id: "1", visitorName: "Dr. Williams", personToMeet: "Principal", time: "2:00 PM", purpose: "Meeting", status: "pending" },
    { id: "2", visitorName: "Mr. Davis", personToMeet: "Vice Principal", time: "3:30 PM", purpose: "Discussion", status: "pending" },
  ];

  const recentEnquiries = [
    { id: "1", parentName: "Sarah Miller", phone: "555-0101", childName: "Tommy Miller", class: "Grade 1", status: "new", createdAt: "Today" },
    { id: "2", parentName: "James Wilson", phone: "555-0102", childName: "Emma Wilson", class: "Grade 3", status: "follow_up", createdAt: "Yesterday" },
  ];

  const dashboardData = {
    todayVisitors,
    appointments,
    recentEnquiries,
    announcements: announcements.map(a => ({
      id: a.id,
      title: a.title,
      date: a.publishedAt.toLocaleDateString(),
    })),
    stats: {
      totalVisitorsToday: todayVisitors.length,
      pendingAppointments: appointments.filter(a => a.status === "pending").length,
      newEnquiries: recentEnquiries.filter(e => e.status === "new").length,
    },
  };

  return <ReceptionistDashboard user={session.user} data={dashboardData} />;
}
