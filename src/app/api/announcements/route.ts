import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { randomUUID } from "crypto";

const createAnnouncementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  targetRole: z.string().optional().nullable(), // null = all roles
  targetClass: z.string().optional().nullable(),
  fileUrl: z.string().url().optional().nullable().or(z.literal("")),
  isPublished: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
  const targetRole = searchParams.get("targetRole") ?? "";
  const schoolId = searchParams.get("schoolId") ?? session.user.schoolId ?? "";
  const search = searchParams.get("search") ?? "";

  // Build where clause
  // Users see announcements targeted to their role or to all (null targetRole)
  const userRole = session.user.role as UserRole;

  const roleFilter =
    userRole === "SUPER_ADMIN" || userRole === "SCHOOL_ADMIN"
      ? {} // admins see all
      : {
          OR: [
            { targetRole: null },
            { targetRole: userRole },
          ],
        };

  const where: Record<string, unknown> = {
    ...(schoolId ? { schoolId } : {}),
    ...(targetRole ? { targetRole } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { content: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    isPublished: true,
    ...roleFilter,
  };

  try {
    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { publishedAt: "desc" },
        include: {
          User: {
            select: {
              id: true,
              name: true,
              image: true,
              role: true,
            },
          },
        },
      }),
      prisma.announcement.count({ where }),
    ]);

    // Transform for client
    const transformedAnnouncements = announcements.map((a) => ({
      ...a,
      author: {
        id: a.User.id,
        name: a.User.name,
        image: a.User.image,
        role: a.User.role,
      },
    }));

    return NextResponse.json({
      data: transformedAnnouncements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/announcements]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles: UserRole[] = ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"];
  if (!allowedRoles.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const schoolId = session.user.schoolId;
  if (!schoolId) {
    return NextResponse.json({ error: "No school associated with this account" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const data = createAnnouncementSchema.parse(body);

    // Teachers can only target their own role or all — not admin-only roles
    if (session.user.role === "TEACHER" && data.targetRole) {
      const restrictedRoles: UserRole[] = ["SUPER_ADMIN", "SCHOOL_ADMIN"];
      if (restrictedRoles.includes(data.targetRole as UserRole)) {
        return NextResponse.json(
          { error: "Teachers cannot create announcements targeting admin roles" },
          { status: 403 }
        );
      }
    }

    const announcement = await prisma.announcement.create({
      data: {
        id: randomUUID(),
        schoolId,
        authorId: session.user.id,
        title: data.title,
        content: data.content,
        targetRole: data.targetRole || null,
        targetClass: data.targetClass || null,
        fileUrl: data.fileUrl || null,
        isPublished: data.isPublished,
        publishedAt: data.isPublished ? new Date() : new Date(),
        updatedAt: new Date(),
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      ...announcement,
      author: {
        id: announcement.User.id,
        name: announcement.User.name,
        image: announcement.User.image,
        role: announcement.User.role,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("[POST /api/announcements]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
