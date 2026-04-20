import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

// ─────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────

const updateMaintenanceSchema = z.object({
  type: z.enum(["ROUTINE", "REPAIR", "INSPECTION", "EMERGENCY"]).optional(),
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  scheduledDate: z.string().optional(),
  completedDate: z.string().nullable().optional(),
  description: z.string().optional(),
  cost: z.number().min(0).optional(),
  mileage: z.number().int().optional(),
  serviceProvider: z.string().optional(),
  notes: z.string().optional(),
});

// ─────────────────────────────────────────────
// GET /api/transport/maintenance/[id] — Get single record
// ─────────────────────────────────────────────

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
    const record = await prisma.vehicleMaintenance.findUnique({
      where: { id },
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
    });

    if (!record) {
      return NextResponse.json({ error: "Maintenance record not found" }, { status: 404 });
    }

    // Check school access
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      if (record.Vehicle.schoolId !== session.user.schoolId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({
      id: record.id,
      vehicleId: record.vehicleId,
      vehicle: {
        id: record.Vehicle.id,
        registration: record.Vehicle.registration,
        make: record.Vehicle.make,
        model: record.Vehicle.model,
      },
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
    });
  } catch (error) {
    console.error("[GET /api/transport/maintenance/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// PUT /api/transport/maintenance/[id] — Update record
// ─────────────────────────────────────────────

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
    const existing = await prisma.vehicleMaintenance.findUnique({
      where: { id },
      include: {
        Vehicle: {
          select: { schoolId: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Maintenance record not found" }, { status: 404 });
    }

    // Check school access
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      if (existing.Vehicle.schoolId !== session.user.schoolId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await req.json();
    const data = updateMaintenanceSchema.parse(body);

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (data.type) updateData.type = data.type;
    if (data.status) updateData.status = data.status;
    if (data.scheduledDate) updateData.scheduledDate = new Date(data.scheduledDate);
    if (data.completedDate !== undefined) updateData.completedDate = data.completedDate ? new Date(data.completedDate) : null;
    if (data.description) updateData.description = data.description;
    if (data.cost !== undefined) updateData.cost = data.cost;
    if (data.mileage !== undefined) updateData.mileage = data.mileage;
    if (data.serviceProvider !== undefined) updateData.serviceProvider = data.serviceProvider;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const record = await prisma.vehicleMaintenance.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(record);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[PUT /api/transport/maintenance/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// DELETE /api/transport/maintenance/[id] — Delete record
// ─────────────────────────────────────────────

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
    const existing = await prisma.vehicleMaintenance.findUnique({
      where: { id },
      include: {
        Vehicle: {
          select: { schoolId: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Maintenance record not found" }, { status: 404 });
    }

    // Check school access
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      if (existing.Vehicle.schoolId !== session.user.schoolId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    await prisma.vehicleMaintenance.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Maintenance record deleted successfully" });
  } catch (error) {
    console.error("[DELETE /api/transport/maintenance/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}