import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

// ─────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────

const createVehicleSchema = z.object({
  registration: z.string().min(1, "Registration number is required"),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  year: z.number().min(1990).max(new Date().getFullYear() + 1),
  capacity: z.number().min(1, "Capacity must be at least 1"),
  driverId: z.string().optional(),
});

// ─────────────────────────────────────────────
// GET /api/transport/vehicles — List vehicles
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

    const vehicles = await prisma.vehicle.findMany({
      where,
      include: {
        Driver: {
          select: { id: true, firstName: true, lastName: true, phone: true, licenseNumber: true },
        },
        Route: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { registration: "asc" },
    });

    // Transform to match frontend expected format
    const transformedVehicles = vehicles.map((vehicle) => ({
      id: vehicle.id,
      registration: vehicle.registration,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      capacity: vehicle.capacity,
      status: vehicle.status,
      driver: vehicle.Driver
        ? {
            id: vehicle.Driver.id,
            firstName: vehicle.Driver.firstName,
            lastName: vehicle.Driver.lastName,
            phone: vehicle.Driver.phone,
            licenseNumber: vehicle.Driver.licenseNumber,
          }
        : null,
      routes: vehicle.Route,
    }));

    return NextResponse.json(transformedVehicles);
  } catch (error) {
    console.error("[GET /api/transport/vehicles]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// POST /api/transport/vehicles — Create vehicle
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
    const data = createVehicleSchema.parse(body);

    // Check for duplicate registration
    const existing = await prisma.vehicle.findUnique({
      where: { registration: data.registration },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Vehicle with this registration already exists" },
        { status: 400 }
      );
    }

    // Verify driver if provided
    if (data.driverId) {
      const driver = await prisma.driver.findUnique({
        where: { id: data.driverId },
      });
      if (!driver) {
        return NextResponse.json({ error: "Driver not found" }, { status: 404 });
      }

      // Check if driver is already assigned to another vehicle
      const driverVehicle = await prisma.vehicle.findUnique({
        where: { driverId: data.driverId },
      });
      if (driverVehicle) {
        return NextResponse.json(
          { error: "Driver is already assigned to another vehicle" },
          { status: 400 }
        );
      }
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        id: randomUUID(),
        schoolId: session.user.schoolId,
        registration: data.registration,
        make: data.make,
        model: data.model,
        year: data.year,
        capacity: data.capacity,
        driverId: data.driverId,
        updatedAt: new Date(),
      },
      include: {
        Driver: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
      },
    });

    return NextResponse.json(vehicle, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[POST /api/transport/vehicles]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
