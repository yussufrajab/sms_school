import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

// ─────────────────────────────────────────────
// Validation Schemas
// ─────────────────────────────────────────────

const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

// ─────────────────────────────────────────────
// GET /api/profile — Get current user profile
// ─────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        schoolId: true,
        School: {
          select: { name: true, code: true },
        },
        Staff: {
          select: {
            employeeId: true,
            department: true,
            designation: true,
            phone: true,
            address: true,
          },
        },
        Student: {
          select: {
            studentId: true,
            Section: {
              select: {
                name: true,
                Class: { select: { name: true } },
              },
            },
          },
        },
        Parent: {
          select: {
            phone: true,
            address: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Merge phone and address from role-specific tables
    const profile = {
      ...user,
      phone: user.Staff?.phone || user.Parent?.phone || undefined,
      address: user.Staff?.address || user.Parent?.address || undefined,
    };

    return NextResponse.json({ user: profile });
  } catch (error) {
    console.error("[GET /api/profile]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// PUT /api/profile — Update profile
// ─────────────────────────────────────────────

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = updateProfileSchema.parse(body);

    // Update user name
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: data.name },
    });

    // Update phone and address in role-specific tables
    if (session.user.role === "TEACHER" || 
        session.user.role === "SCHOOL_ADMIN" || 
        session.user.role === "ACCOUNTANT" || 
        session.user.role === "LIBRARIAN" || 
        session.user.role === "RECEPTIONIST" || 
        session.user.role === "IT_ADMIN") {
      await prisma.staff.update({
        where: { userId: session.user.id },
        data: {
          phone: data.phone,
          address: data.address,
        },
      });
    } else if (session.user.role === "PARENT") {
      await prisma.parent.update({
        where: { userId: session.user.id },
        data: {
          phone: data.phone,
          address: data.address,
        },
      });
    }

    // Fetch updated profile
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        schoolId: true,
        School: {
          select: { name: true, code: true },
        },
        Staff: {
          select: {
            employeeId: true,
            department: true,
            designation: true,
            phone: true,
            address: true,
          },
        },
        Student: {
          select: {
            studentId: true,
            Section: {
              select: {
                name: true,
                Class: { select: { name: true } },
              },
            },
          },
        },
        Parent: {
          select: {
            phone: true,
            address: true,
          },
        },
      },
    });

    const profile = {
      ...user,
      phone: user?.Staff?.phone || user?.Parent?.phone || undefined,
      address: user?.Staff?.address || user?.Parent?.address || undefined,
    };

    return NextResponse.json({ user: profile });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[PUT /api/profile]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// PATCH /api/profile — Change password
// ─────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = changePasswordSchema.parse(body);

    // Get current user with password
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "User not found or no password set" },
        { status: 400 }
      );
    }

    // Verify current password
    const isValid = await bcrypt.compare(data.currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(data.newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ message: "Password changed successfully" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[PATCH /api/profile]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
