import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Get unread notification count
  const notificationCount = await prisma.notification.count({
    where: {
      userId: session.user.id,
      isRead: false,
    },
  });

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-white">
      <Sidebar userRole={session.user.role} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar user={session.user} notificationCount={notificationCount} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
