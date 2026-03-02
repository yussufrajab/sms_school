import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EventsClient } from "@/components/communication/events-client";

export const metadata = {
  title: "Events | Communication | School Management System",
  description: "Manage school events and calendar",
};

export default async function EventsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userRole = session.user.role;
  const schoolId = session.user.schoolId;

  if (!schoolId) redirect("/login");

  // Fetch events for the school
  const events = await prisma.event.findMany({
    where: { schoolId },
    orderBy: { startDate: "asc" },
  });

  // Transform events for client
  const transformedEvents = events.map((event) => ({
    ...event,
    startDate: event.startDate.toISOString(),
    endDate: event.endDate?.toISOString() || null,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  }));

  // Check if user can manage events
  const canManage = ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"].includes(userRole);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">School Events</h1>
        <p className="text-muted-foreground">
          View and manage school events, holidays, and important dates
        </p>
      </div>

      <EventsClient
        initialEvents={transformedEvents}
        userRole={userRole}
        canManage={canManage}
      />
    </div>
  );
}
