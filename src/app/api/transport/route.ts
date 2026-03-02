import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";

const stopSchema = z.object({
  name: z.string().min(1, "Stop name is required"),
  estimatedTime: z.string().min(1, "Estimated time is required"), // e.g. "07:30 AM" or "15 min"
});

const createRouteSchema = z.object({
  name: z.string().min(1, "Route name is required"),
  code: z.string().min(1, "Route code is required"),
  startPoint: z.string().min(1, "Start point is required"),
  endPoint: z.string().min(1, "End point is required"),
  stops: z.array(stopSchema).default([]),
  vehicleId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
  const search = searchParams.get("search") ?? "";
  const vehicleId = searchParams.get("vehicleId") ?? "";

  const schoolId = session.user.schoolId;

  const where: Record<string, unknown> = {
    ...(schoolId ? { schoolId } : {}),
    ...(vehicleId ? { vehicleId } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { code: { contains: search, mode: "insensitive" } },
            { startPoint: { contains: search, mode: "insensitive" } },
            { endPoint: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  try {
    const [routes, total] = await Promise.all([
      prisma.route.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          Vehicle: {
            select: {
              id: true,
              registration: true,
              make: true,
              model: true,
              year: true,
              capacity: true,
              status: true,
              Driver: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                  licenseNumber: true,
                },
              },
            },
          },
          _count: {
            select: { StudentTransport: true },
          },
        },
      }),
      prisma.route.count({ where }),
    ]);

    return NextResponse.json({
      data: routes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/transport]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN"];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const schoolId = session.user.schoolId;
  if (!schoolId) {
    return NextResponse.json({ error: "No school associated with this account" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const data = createRouteSchema.parse(body);

    // Check for duplicate route code within the school
    const existing = await prisma.route.findFirst({
      where: { schoolId, code: data.code },
    });
    if (existing) {
      return NextResponse.json(
        { error: `A route with code "${data.code}" already exists in this school` },
        { status: 409 }
      );
    }

    // Validate vehicleId if provided
    if (data.vehicleId) {
      const vehicle = await prisma.vehicle.findFirst({
        where: { id: data.vehicleId, schoolId },
      });
      if (!vehicle) {
        return NextResponse.json(
          { error: "Vehicle not found or does not belong to this school" },
          { status: 404 }
        );
      }
    }

    const route = await prisma.route.create({
      data: {
        id: randomUUID(),
        schoolId,
        name: data.name,
        code: data.code,
        startPoint: data.startPoint,
        endPoint: data.endPoint,
        stops: data.stops,
        vehicleId: data.vehicleId ?? null,
        updatedAt: new Date(),
      },
      include: {
        Vehicle: {
          select: {
            id: true,
            registration: true,
            make: true,
            model: true,
            capacity: true,
            status: true,
            Driver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
        _count: { select: { StudentTransport: true } },
      },
    });

    return NextResponse.json(route, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("[POST /api/transport]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
