import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MessagesClient } from "@/components/communication/messages-client";

export const metadata = {
  title: "Messages | Communication | School Management System",
  description: "Send and receive messages",
};

export default async function MessagesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const currentUserId = session.user.id;
  const userRole = session.user.role;
  const schoolId = session.user.schoolId;

  if (!schoolId) redirect("/login");

  // Fetch messages for the current user (both sent and received)
  const messages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: currentUserId }, { receiverId: currentUserId }],
    },
    include: {
      User_Message_senderIdToUser: {
        select: { id: true, name: true, email: true, role: true, image: true },
      },
      User_Message_receiverIdToUser: {
        select: { id: true, name: true, email: true, role: true, image: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Fetch users that can be messaged
  // Students and parents can only message teachers and admins
  // Teachers and admins can message anyone
  const whereClause: Record<string, unknown> = {
    schoolId,
    isActive: true,
    id: { not: currentUserId }, // Exclude self
  };

  if (userRole === "STUDENT" || userRole === "PARENT") {
    whereClause.role = { in: ["TEACHER", "SCHOOL_ADMIN", "SUPER_ADMIN"] };
  }

  const users = await prisma.user.findMany({
    where: whereClause,
    select: { id: true, name: true, email: true, role: true, image: true },
    orderBy: { name: "asc" },
  });

  // Transform messages for client
  const transformedMessages = messages.map((m) => ({
    ...m,
    sender: m.User_Message_senderIdToUser,
    receiver: m.User_Message_receiverIdToUser,
    createdAt: m.createdAt.toISOString(),
    readAt: m.readAt?.toISOString() || null,
  }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-muted-foreground">
          Send and receive messages with teachers, staff, and administrators
        </p>
      </div>

      <MessagesClient
        initialMessages={transformedMessages}
        users={users}
        currentUserId={currentUserId}
        userRole={userRole}
      />
    </div>
  );
}
