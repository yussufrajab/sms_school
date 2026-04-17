import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { NotificationsClient } from "@/components/notifications/notifications-client";

export const metadata = {
  title: "Notifications | Communication | School Management System",
  description: "View and manage your notifications",
};

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        link: true,
        isRead: true,
        readAt: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where: { userId: session.user.id } }),
    prisma.notification.count({
      where: { userId: session.user.id, isRead: false },
    }),
  ]);

  const transformedNotifications = notifications.map(n => ({
    ...n,
    link: n.link ?? undefined,
    readAt: n.readAt ? n.readAt.toISOString() : undefined,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-muted-foreground">View and manage your notifications</p>
      </div>

      <NotificationsClient
        initialNotifications={transformedNotifications}
        initialTotal={total}
        initialUnreadCount={unreadCount}
      />
    </div>
  );
}