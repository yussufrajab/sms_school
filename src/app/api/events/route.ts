import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { EventCategory, EventVisibility, UserRole } from "@prisma/client";
import { randomUUID } from "crypto";

const createEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  startDate: z.string().datetime("Invalid start date"),
  endDate: z.string().datetime("Invalid end date").optional().nullable(),
  location: z.string().optional().nullable(),
  category: z.nativeEnum(EventCategory).default("OTHER"),
  visibility: z.nativeEnum(EventVisibility).default("ALL"),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
  const category = searchParams.get("category") ?? "";
  const visibility = searchParams.get("visibility") ?? "";
  const upcoming = searchParams.get("upcoming"); // "true" = only future events
  const search = searchParams.get("search") ?? "";

  const schoolId = session.user.schoolId;
  const userRole = session.user.role as UserRole;

  // Determine which visibility levels this user can see
  const visibilityFilter: EventVisibility[] = ["ALL"];
  if (userRole === "STUDENT" || userRole === "PARENT") {
    visibilityFilter.push("STUDENTS_ONLY");
  } else {
    // Staff and admins see staff-only and all
    visibilityFilter.push("STAFF_ONLY");
    visibilityFilter.push("STUDENTS_ONLY");
  }

  const where: Record<string, unknown> = {
    ...(schoolId ? { schoolId } : {}),
    ...(category ? { category: category as EventCategory } : {}),
    ...(visibility ? { visibility: visibility as EventVisibility } : { visibility: { in: visibilityFilter } }),
    ...(upcoming === "true" ? { startDate: { gte: new Date() } } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
            { location: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  try {
    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startDate: "asc" },
        select: {
          id: true,
          schoolId: true,
          title: true,
          description: true,
          startDate: true,
          endDate: true,
          location: true,
          category: true,
          visibility: true,
          createdBy: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.event.count({ where }),
    ]);

    return NextResponse.json({
      data: events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/events]", error);
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
    const data = createEventSchema.parse(body);

    const startDate = new Date(data.startDate);
    const endDate = data.endDate ? new Date(data.endDate) : null;

    if (endDate && endDate < startDate) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    // Teachers can only create events visible to ALL or STUDENTS_ONLY
    if (session.user.role === "TEACHER" && data.visibility === "STAFF_ONLY") {
      return NextResponse.json(
        { error: "Teachers cannot create staff-only events" },
        { status: 403 }
      );
    }

    const event = await prisma.event.create({
      data: {
        id: randomUUID(),
        schoolId,
        title: data.title,
        description: data.description || null,
        startDate,
        endDate,
        location: data.location || null,
        category: data.category,
        visibility: data.visibility,
        createdBy: session.user.id,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("[POST /api/events]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
