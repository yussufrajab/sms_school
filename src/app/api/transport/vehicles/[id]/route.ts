import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

const updateVehicleSchema = z.object({
  registration: z.string().min(1, "Registration number is required").optional(),
  make: z.string().min(1, "Make is required").optional(),
  model: z.string().min(1, "Model is required").optional(),
  year: z.number().min(1990).max(new Date().getFullYear() + 1).optional(),
  capacity: z.number().min(1, "Capacity must be at least 1").optional(),
  driverId: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "UNDER_MAINTENANCE", "RETIRED"]).optional(),
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
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        Driver: {
          select: { id: true, firstName: true, lastName: true, phone: true, licenseNumber: true },
        },
        Route: { select: { id: true, name: true, code: true } },
      },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    return NextResponse.json(vehicle);
  } catch (error) {
    console.error("[GET /api/transport/vehicles/[id]]", error);
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
    const existing = await prisma.vehicle.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    // Verify school access
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      if (existing.schoolId !== session.user.schoolId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await req.json();
    const data = updateVehicleSchema.parse(body);

    // Check for duplicate registration if changing
    if (data.registration && data.registration !== existing.registration) {
      const duplicate = await prisma.vehicle.findUnique({
        where: { registration: data.registration },
      });
      if (duplicate) {
        return NextResponse.json({ error: "Vehicle with this registration already exists" }, { status: 400 });
      }
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
      const driverVehicle = await prisma.vehicle.findFirst({
        where: { driverId: data.driverId, id: { not: id } },
      });
      if (driverVehicle) {
        return NextResponse.json({ error: "Driver is already assigned to another vehicle" }, { status: 400 });
      }
    }

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        registration: data.registration,
        make: data.make,
        model: data.model,
        year: data.year,
        capacity: data.capacity,
        driverId: data.driverId,
        status: data.status,
      },
      include: {
        Driver: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
      },
    });

    return NextResponse.json(vehicle);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[PUT /api/transport/vehicles/[id]]", error);
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
    const existing = await prisma.vehicle.findUnique({
      where: { id },
      include: { _count: { select: { Route: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    // Verify school access
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      if (existing.schoolId !== session.user.schoolId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Check if vehicle has routes assigned
    if (existing._count.Route > 0) {
      return NextResponse.json(
        { error: "Cannot delete vehicle with routes assigned. Remove routes first." },
        { status: 400 }
      );
    }

    await prisma.vehicle.delete({ where: { id } });

    return NextResponse.json({ message: "Vehicle deleted successfully" });
  } catch (error) {
    console.error("[DELETE /api/transport/vehicles/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
