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
  phone: z.string().optional(),
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

    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    return NextResponse.json(driver);
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

    if (!existing) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const body = await req.json();
    const data = updateDriverSchema.parse(body);

    // Check for duplicate license number if changing
    if (data.licenseNumber && data.licenseNumber !== existing.licenseNumber) {
      const duplicate = await prisma.driver.findUnique({
        where: { licenseNumber: data.licenseNumber },
      });
      if (duplicate) {
        return NextResponse.json({ error: "Driver with this license number already exists" }, { status: 400 });
      }
    }

    const driver = await prisma.driver.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        licenseNumber: data.licenseNumber,
        licenseExpiry: data.licenseExpiry ? new Date(data.licenseExpiry) : undefined,
        phone: data.phone,
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

    if (!existing) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    // Check if driver is assigned to a vehicle
    if (existing.Vehicle) {
      return NextResponse.json(
        { error: "Cannot delete driver assigned to a vehicle. Remove from vehicle first." },
        { status: 400 }
      );
    }

    await prisma.driver.delete({ where: { id } });

    return NextResponse.json({ message: "Driver deleted successfully" });
  } catch (error) {
    console.error("[DELETE /api/transport/drivers/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
