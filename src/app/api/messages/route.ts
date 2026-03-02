import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";

const createMessageSchema = z.object({
  receiverId: z.string().min(1, "Recipient is required"),
  subject: z.string().optional().nullable(),
  content: z.string().min(1, "Message content is required"),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
  const type = searchParams.get("type"); // "sent" or "received"

  const userId = session.user.id;

  const where: Record<string, unknown> = type === "sent"
    ? { senderId: userId }
    : type === "received"
    ? { receiverId: userId }
    : {
        OR: [{ senderId: userId }, { receiverId: userId }],
      };

  try {
    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          User_Message_senderIdToUser: {
            select: { id: true, name: true, email: true, role: true, image: true },
          },
          User_Message_receiverIdToUser: {
            select: { id: true, name: true, email: true, role: true, image: true },
          },
        },
      }),
      prisma.message.count({ where }),
    ]);

    // Transform for client
    const transformedMessages = messages.map((m) => ({
      ...m,
      sender: m.User_Message_senderIdToUser,
      receiver: m.User_Message_receiverIdToUser,
    }));

    return NextResponse.json({
      data: transformedMessages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/messages]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = createMessageSchema.parse(body);

    // Verify recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: data.receiverId },
      select: { id: true, role: true, schoolId: true },
    });

    if (!recipient) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    // Check if sender can message this recipient based on role restrictions
    const senderRole = session.user.role;
    const recipientRole = recipient.role;

    // Students and parents can only message teachers and admins
    if (senderRole === "STUDENT" || senderRole === "PARENT") {
      const allowedRecipientRoles = ["TEACHER", "SCHOOL_ADMIN", "SUPER_ADMIN"];
      if (!allowedRecipientRoles.includes(recipientRole)) {
        return NextResponse.json(
          { error: "You can only message teachers or administrators" },
          { status: 403 }
        );
      }
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        id: randomUUID(),
        senderId: session.user.id,
        receiverId: data.receiverId,
        subject: data.subject || null,
        content: data.content,
      },
      include: {
        User_Message_senderIdToUser: {
          select: { id: true, name: true, email: true, role: true, image: true },
        },
        User_Message_receiverIdToUser: {
          select: { id: true, name: true, email: true, role: true, image: true },
        },
      },
    });

    // Transform for client
    const transformedMessage = {
      ...message,
      sender: message.User_Message_senderIdToUser,
      receiver: message.User_Message_receiverIdToUser,
    };

    // Create notification for recipient
    await prisma.notification.create({
      data: {
        id: randomUUID(),
        userId: data.receiverId,
        type: "MESSAGE",
        title: "New Message",
        message: `You have a new message from ${session.user.name || "a user"}`,
        link: "/communication/messages",
      },
    });

    return NextResponse.json(transformedMessage, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("[POST /api/messages]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
