import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const markReadSchema = z.object({
  messageIds: z.array(z.string()).min(1, "At least one message ID is required"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { messageIds } = markReadSchema.parse(body);

    // Only allow marking messages as read if the current user is the receiver
    const result = await prisma.message.updateMany({
      where: {
        id: { in: messageIds },
        receiverId: session.user.id,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      updated: result.count,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("[POST /api/messages/mark-read]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
