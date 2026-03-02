import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

const updateRouteSchema = z.object({
  name: z.string().min(1, "Route name is required").optional(),
  code: z.string().min(1, "Route code is required").optional(),
  startPoint: z.string().min(1, "Start point is required").optional(),
  endPoint: z.string().min(1, "End point is required").optional(),
  stops: z.array(z.object({
    name: z.string(),
    estimatedTime: z.string(),
  })).optional(),
  vehicleId: z.string().nullable().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const route = await prisma.route.findUnique({
      where: { id },
      include: {
        Vehicle: {
          select: {
            id: true,
            registration: true,
            make: true,
            model: true,
            Driver: {
              select: { id: true, firstName: true, lastName: true, phone: true },
            },
          },
        },
        _count: { select: { StudentTransport: true } },
      },
    });

    if (!route) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    return NextResponse.json(route);
  } catch (error) {
    console.error("[GET /api/transport/routes/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles: UserRole[] = ["SUPER_ADMIN", "SCHOOL_ADMIN"];
  if (!allowedRoles.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.route.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    // Verify school access
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      if (existing.schoolId !== session.user.schoolId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await req.json();
    const data = updateRouteSchema.parse(body);

    // Check for duplicate code if changing
    if (data.code && data.code !== existing.code) {
      const duplicate = await prisma.route.findFirst({
        where: { schoolId: existing.schoolId, code: data.code, id: { not: id } },
      });
      if (duplicate) {
        return NextResponse.json({ error: "Route code already exists" }, { status: 400 });
      }
    }

    // Verify vehicle if provided
    if (data.vehicleId) {
      const vehicle = await prisma.vehicle.findFirst({
        where: { id: data.vehicleId, schoolId: existing.schoolId },
      });
      if (!vehicle) {
        return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
      }
    }

    const route = await prisma.route.update({
      where: { id },
      data: {
        name: data.name,
        code: data.code,
        startPoint: data.startPoint,
        endPoint: data.endPoint,
        stops: data.stops,
        vehicleId: data.vehicleId,
      },
      include: {
        Vehicle: {
          select: { id: true, registration: true, make: true, model: true },
        },
      },
    });

    return NextResponse.json(route);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[PUT /api/transport/routes/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles: UserRole[] = ["SUPER_ADMIN", "SCHOOL_ADMIN"];
  if (!allowedRoles.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.route.findUnique({
      where: { id },
      include: { _count: { select: { StudentTransport: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    // Verify school access
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      if (existing.schoolId !== session.user.schoolId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Check if route has students assigned
    if (existing._count.StudentTransport > 0) {
      return NextResponse.json(
        { error: "Cannot delete route with students assigned" },
        { status: 400 }
      );
    }

    await prisma.route.delete({ where: { id } });

    return NextResponse.json({ message: "Route deleted successfully" });
  } catch (error) {
    console.error("[DELETE /api/transport/routes/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
