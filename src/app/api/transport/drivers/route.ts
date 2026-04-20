import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

// ─────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────

const createDriverSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  licenseNumber: z.string().min(1, "License number is required"),
  licenseExpiry: z.string().min(1, "License expiry date is required"),
  phone: z.string().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

// ─────────────────────────────────────────────
// GET /api/transport/drivers — List drivers
// ─────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const where: Record<string, unknown> = {
      deletedAt: null, // Exclude soft-deleted
    };

    // Filter by school for non-super-admins
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      where.schoolId = session.user.schoolId;
    }

    const drivers = await prisma.driver.findMany({
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
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });

    // Transform to match frontend expected format
    const transformedDrivers = drivers.map((driver) => ({
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
    }));

    return NextResponse.json(transformedDrivers);
  } catch (error) {
    console.error("[GET /api/transport/drivers]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// POST /api/transport/drivers — Create driver
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
    const data = createDriverSchema.parse(body);

    // Check for duplicate license number within the same school
    const existing = await prisma.driver.findFirst({
      where: {
        schoolId: session.user.schoolId,
        licenseNumber: data.licenseNumber,
        deletedAt: null,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Driver with this license number already exists in this school" },
        { status: 400 }
      );
    }

    const driver = await prisma.driver.create({
      data: {
        id: randomUUID(),
        schoolId: session.user.schoolId,
        firstName: data.firstName,
        lastName: data.lastName,
        licenseNumber: data.licenseNumber,
        licenseExpiry: new Date(data.licenseExpiry),
        phone: data.phone || null,
        isActive: data.isActive ?? true,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(driver, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[POST /api/transport/drivers]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}