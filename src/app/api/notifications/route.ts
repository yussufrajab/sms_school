import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { NotificationType } from "@prisma/client";

const markReadSchema = z.union([
  z.object({
    ids: z.array(z.string().min(1)).min(1, "At least one notification ID is required"),
    all: z.undefined().optional(),
  }),
  z.object({
    all: z.literal(true),
    ids: z.undefined().optional(),
  }),
]);

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
  const isRead = searchParams.get("isRead"); // "true" | "false" | null
  const type = searchParams.get("type") ?? ""; // NotificationType value

  const where: Record<string, unknown> = {
    userId: session.user.id,
    ...(isRead === "true" ? { isRead: true } : isRead === "false" ? { isRead: false } : {}),
    ...(type ? { type: type as NotificationType } : {}),
  };

  try {
    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          userId: true,
          type: true,
          title: true,
          message: true,
          link: true,
          isRead: true,
          readAt: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({ where }),
      // Always return total unread count regardless of filter
      prisma.notification.count({
        where: { userId: session.user.id, isRead: false },
      }),
    ]);

    return NextResponse.json({
      data: notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/notifications]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = markReadSchema.parse(body);

    const now = new Date();

    if ("all" in parsed && parsed.all === true) {
      // Mark all unread notifications as read for this user
      const result = await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: now,
        },
      });

      return NextResponse.json({
        message: `Marked ${result.count} notification(s) as read`,
        count: result.count,
      });
    }

    if ("ids" in parsed && parsed.ids) {
      // Verify all notification IDs belong to this user before updating
      const ownedCount = await prisma.notification.count({
        where: {
          id: { in: parsed.ids },
          userId: session.user.id,
        },
      });

      if (ownedCount !== parsed.ids.length) {
        return NextResponse.json(
          { error: "One or more notification IDs are invalid or do not belong to you" },
          { status: 403 }
        );
      }

      const result = await prisma.notification.updateMany({
        where: {
          id: { in: parsed.ids },
          userId: session.user.id,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: now,
        },
      });

      return NextResponse.json({
        message: `Marked ${result.count} notification(s) as read`,
        count: result.count,
      });
    }

    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("[PATCH /api/notifications]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
