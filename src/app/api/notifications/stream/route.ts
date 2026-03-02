import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────
// GET /api/notifications/stream — SSE for real-time notifications
// ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let intervalId: NodeJS.Timeout;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      const connectMessage = `data: ${JSON.stringify({ type: "connected", timestamp: new Date().toISOString() })}\n\n`;
      controller.enqueue(encoder.encode(connectMessage));

      // Send unread count periodically
      const sendUnreadCount = async () => {
        try {
          const count = await prisma.notification.count({
            where: {
              userId: session.user.id,
              isRead: false,
            },
          });

          const message = `data: ${JSON.stringify({ type: "unread_count", count, timestamp: new Date().toISOString() })}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (error) {
          console.error("[SSE] Error fetching unread count:", error);
        }
      };

      // Send unread count every 30 seconds
      intervalId = setInterval(sendUnreadCount, 30000);

      // Send initial unread count
      await sendUnreadCount();
    },
    cancel() {
      clearInterval(intervalId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
