import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

const updateDriverSchema = z.object({
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  licenseNumber: z.string().min(1, "License number is required").optional(),
  licenseExpiry: z.string().min(1, "License expiry date is required").optional(),
  phone: z.string().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
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
    const driver = await prisma.driver.findUnique({
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

    if (!driver || driver.deletedAt) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    // Check school access for non-super-admins
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      if (driver.schoolId !== session.user.schoolId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Transform to match frontend expected format
    const transformedDriver = {
      id: driver.id,
      firstName: driver.firstName,
      lastName: driver.lastName,
      licenseNumber: driver.licenseNumber,
      licenseExpiry: driver.licenseExpiry.toISOString(),
      phone: driver.phone,
      isActive: driver.isActive,
      vehicle: driver.Vehicle
        ? {
            id: driver.Vehicle.id,
            registration: driver.Vehicle.registration,
            make: driver.Vehicle.make,
            model: driver.Vehicle.model,
          }
        : null,
    };

    return NextResponse.json(transformedDriver);
  } catch (error) {
    console.error("[GET /api/transport/drivers/[id]]", error);
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
    const existing = await prisma.driver.findUnique({
      where: { id },
    });

    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    // Check school access for non-super-admins
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      if (existing.schoolId !== session.user.schoolId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await req.json();
    const data = updateDriverSchema.parse(body);

    // Check for duplicate license number within the same school if changing
    if (data.licenseNumber && data.licenseNumber !== existing.licenseNumber) {
      const duplicate = await prisma.driver.findFirst({
        where: {
          schoolId: existing.schoolId,
          licenseNumber: data.licenseNumber,
          deletedAt: null,
          NOT: { id },
        },
      });
      if (duplicate) {
        return NextResponse.json({ error: "Driver with this license number already exists in this school" }, { status: 400 });
      }
    }

    const driver = await prisma.driver.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        licenseNumber: data.licenseNumber,
        licenseExpiry: data.licenseExpiry ? new Date(data.licenseExpiry) : undefined,
        phone: data.phone || null,
        isActive: data.isActive,
      },
    });

    return NextResponse.json(driver);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[PUT /api/transport/drivers/[id]]", error);
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
    const existing = await prisma.driver.findUnique({
      where: { id },
      include: { Vehicle: true },
    });

    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    // Check school access for non-super-admins
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      if (existing.schoolId !== session.user.schoolId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Check if driver is assigned to a vehicle
    if (existing.Vehicle) {
      return NextResponse.json(
        { error: "Cannot delete driver assigned to a vehicle. Remove from vehicle first." },
        { status: 400 }
      );
    }

    // Soft delete
    await prisma.driver.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ message: "Driver deleted successfully" });
  } catch (error) {
    console.error("[DELETE /api/transport/drivers/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}