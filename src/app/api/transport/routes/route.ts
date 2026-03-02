import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

// ─────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────

const createRouteSchema = z.object({
  name: z.string().min(1, "Route name is required"),
  code: z.string().min(1, "Route code is required"),
  startPoint: z.string().min(1, "Start point is required"),
  endPoint: z.string().min(1, "End point is required"),
  stops: z.array(z.object({
    name: z.string(),
    estimatedTime: z.string(),
  })).min(1, "At least one stop is required"),
  vehicleId: z.string().optional(),
});

// ─────────────────────────────────────────────
// GET /api/transport/routes — List routes
// ─────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const where: Record<string, unknown> = {};

    // Scope to school for non-super-admins
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      where.schoolId = session.user.schoolId;
    }

    // For students, show only their assigned route
    if (session.user.role === "STUDENT") {
      const student = await prisma.student.findFirst({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (student) {
        const studentTransport = await prisma.studentTransport.findUnique({
          where: { studentId: student.id },
          select: { routeId: true },
        });
        if (studentTransport) {
          where.id = studentTransport.routeId;
        } else {
          return NextResponse.json([]);
        }
      }
    }

    const routes = await prisma.route.findMany({
      where,
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
      orderBy: { name: "asc" },
    });

    return NextResponse.json(routes);
  } catch (error) {
    console.error("[GET /api/transport/routes]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// POST /api/transport/routes — Create route
// ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles: UserRole[] = ["SUPER_ADMIN", "SCHOOL_ADMIN"];
  if (!allowedRoles.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!session.user.schoolId) {
    return NextResponse.json({ error: "School not found" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const data = createRouteSchema.parse(body);

    // Check for duplicate code
    const existing = await prisma.route.findFirst({
      where: { schoolId: session.user.schoolId, code: data.code },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Route code already exists" },
        { status: 400 }
      );
    }

    // Verify vehicle if provided
    if (data.vehicleId) {
      const vehicle = await prisma.vehicle.findFirst({
        where: { id: data.vehicleId, schoolId: session.user.schoolId },
      });
      if (!vehicle) {
        return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
      }
    }

    const route = await prisma.route.create({
      data: {
        id: randomUUID(),
        schoolId: session.user.schoolId,
        name: data.name,
        code: data.code,
        startPoint: data.startPoint,
        endPoint: data.endPoint,
        stops: data.stops,
        vehicleId: data.vehicleId,
        updatedAt: new Date(),
      },
      include: {
        Vehicle: {
          select: { id: true, registration: true, make: true, model: true },
        },
      },
    });

    return NextResponse.json(route, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[POST /api/transport/routes]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
