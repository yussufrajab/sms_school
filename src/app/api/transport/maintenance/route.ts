import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

// ─────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────

const createMaintenanceSchema = z.object({
  vehicleId: z.string().min(1, "Vehicle is required"),
  type: z.enum(["ROUTINE", "REPAIR", "INSPECTION", "EMERGENCY"]),
  scheduledDate: z.string().min(1, "Scheduled date is required"),
  description: z.string().min(1, "Description is required"),
  cost: z.number().min(0).default(0),
  mileage: z.number().int().optional(),
  serviceProvider: z.string().optional(),
  notes: z.string().optional(),
});

// ─────────────────────────────────────────────
// GET /api/transport/maintenance — List maintenance records
// ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const vehicleId = searchParams.get("vehicleId");
  const status = searchParams.get("status");
  const upcoming = searchParams.get("upcoming");

  try {
    const where: Record<string, unknown> = {};

    // Filter by vehicle
    if (vehicleId) {
      where.vehicleId = vehicleId;
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Filter by school for non-super-admins
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      where.Vehicle = { schoolId: session.user.schoolId };
    }

    // Upcoming maintenance (scheduled in the future, not completed)
    if (upcoming === "true") {
      where.status = "SCHEDULED";
      where.scheduledDate = { gte: new Date() };
    }

    const records = await prisma.vehicleMaintenance.findMany({
      where,
      include: {
        Vehicle: {
          select: {
            id: true,
            registration: true,
            make: true,
            model: true,
            schoolId: true,
          },
        },
      },
      orderBy: { scheduledDate: "asc" },
    });

    // Transform to match frontend expected format
    const transformedRecords = records.map((record) => ({
      id: record.id,
      vehicleId: record.vehicleId,
      vehicle: record.Vehicle
        ? {
            id: record.Vehicle.id,
            registration: record.Vehicle.registration,
            make: record.Vehicle.make,
            model: record.Vehicle.model,
          }
        : null,
      type: record.type,
      status: record.status,
      scheduledDate: record.scheduledDate.toISOString(),
      completedDate: record.completedDate?.toISOString() || null,
      description: record.description,
      cost: record.cost,
      mileage: record.mileage,
      serviceProvider: record.serviceProvider,
      notes: record.notes,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    }));

    return NextResponse.json(transformedRecords);
  } catch (error) {
    console.error("[GET /api/transport/maintenance]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// POST /api/transport/maintenance — Create maintenance record
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

  try {
    const body = await req.json();
    const data = createMaintenanceSchema.parse(body);

    // Verify vehicle exists and belongs to school
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: data.vehicleId },
      select: { schoolId: true },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    // Check school access
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      if (vehicle.schoolId !== session.user.schoolId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const record = await prisma.vehicleMaintenance.create({
      data: {
        id: randomUUID(),
        vehicleId: data.vehicleId,
        type: data.type,
        status: "SCHEDULED",
        scheduledDate: new Date(data.scheduledDate),
        description: data.description,
        cost: data.cost,
        mileage: data.mileage,
        serviceProvider: data.serviceProvider,
        notes: data.notes,
      },
      include: {
        Vehicle: {
          select: {
            id: true,
            registration: true,
            make: true,
            model: true,
          },
        },
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[POST /api/transport/maintenance]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}