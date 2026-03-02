import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SettingsClient } from "@/components/settings/settings-client";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("//login");

  const isAdmin = ["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(session.user.role);

  // Get user info - available for future use
  const _user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      schoolId: true,
    },
  });

  // Default notification preferences
  const defaultPreferences = {
    email: true,
    push: true,
    attendance: true,
    assignments: true,
    exams: true,
    fees: true,
    announcements: true,
    events: true,
  };

  let school = null;
  if (isAdmin && session.user.schoolId) {
    school = await prisma.school.findUnique({
      where: { id: session.user.schoolId },
      select: {
        name: true,
        code: true,
        address: true,
        phone: true,
        email: true,
        website: true,
        timezone: true,
        currency: true,
        studentIdFormat: true,
        employeeIdFormat: true,
      },
    });
  }

  const settings = {
    notificationPreferences: defaultPreferences,
    school,
    isAdmin,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your preferences and school settings</p>
      </div>

      <SettingsClient initialSettings={settings} />
    </div>
  );
}
