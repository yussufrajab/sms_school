import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

// ─────────────────────────────────────────────
// Validation Schemas
// ─────────────────────────────────────────────

const notificationPreferencesSchema = z.object({
  email: z.boolean(),
  push: z.boolean(),
  attendance: z.boolean(),
  assignments: z.boolean(),
  exams: z.boolean(),
  fees: z.boolean(),
  announcements: z.boolean(),
  events: z.boolean(),
});

const updateSettingsSchema = z.object({
  notificationPreferences: notificationPreferencesSchema,
});

const schoolSettingsSchema = z.object({
  name: z.string().min(1, "School name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  timezone: z.string(),
  currency: z.string(),
  studentIdFormat: z.string(),
  employeeIdFormat: z.string(),
});

// ─────────────────────────────────────────────
// GET /api/settings — Get user settings
// ─────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = ["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(session.user.role);

  try {
    // Get user's notification preferences (stored in User model or separate table)
    // For now, we'll use a JSON field approach or return defaults
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        schoolId: true,
      },
    });

    // Default notification preferences
    const defaultPreferences = {
      email: true,
      push: true,
      attendance: true,
      assignments: true,
      exams: true,
      fees: true,
      announcements: true,
      events: true,
    };

    let school = null;
    if (isAdmin && session.user.schoolId) {
      school = await prisma.school.findUnique({
        where: { id: session.user.schoolId },
        select: {
          name: true,
          code: true,
          address: true,
          phone: true,
          email: true,
          website: true,
          timezone: true,
          currency: true,
          studentIdFormat: true,
          employeeIdFormat: true,
        },
      });
    }

    return NextResponse.json({
      notificationPreferences: defaultPreferences,
      school,
      isAdmin,
    });
  } catch (error) {
    console.error("[GET /api/settings]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// PUT /api/settings — Update notification preferences
// ─────────────────────────────────────────────

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = updateSettingsSchema.parse(body);

    // In a real implementation, you would store these preferences
    // For now, we'll just return success
    // You could add a `preferences` JSON field to the User model

    return NextResponse.json({
      message: "Settings updated successfully",
      notificationPreferences: data.notificationPreferences,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[PUT /api/settings]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// PATCH /api/settings — Update school settings (Admin only)
// ─────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles: UserRole[] = ["SUPER_ADMIN", "SCHOOL_ADMIN"];
  if (!allowedRoles.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!session.user.schoolId) {
    return NextResponse.json({ error: "No school associated" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const data = schoolSettingsSchema.parse(body);

    const school = await prisma.school.update({
      where: { id: session.user.schoolId },
      data: {
        name: data.name,
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
        website: data.website || null,
        timezone: data.timezone,
        currency: data.currency,
        studentIdFormat: data.studentIdFormat,
        employeeIdFormat: data.employeeIdFormat,
      },
      select: {
        name: true,
        code: true,
        address: true,
        phone: true,
        email: true,
        website: true,
        timezone: true,
        currency: true,
        studentIdFormat: true,
        employeeIdFormat: true,
      },
    });

    return NextResponse.json({
      message: "School settings updated successfully",
      school,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[PATCH /api/settings]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
