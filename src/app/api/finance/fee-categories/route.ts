import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

// ─────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────

const createFeeCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  isRecurring: z.boolean().default(true),
});

// ─────────────────────────────────────────────
// GET /api/finance/fee-categories — List fee categories
// ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
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

    const categories = await prisma.feeCategory.findMany({
      where,
      include: {
        _count: {
          select: { FeeStructure: true },
        },
      },
      orderBy: { name: "asc" },
    });

    // Transform for client compatibility
    const transformed = categories.map(c => ({
      ...c,
      _count: {
        feeStructures: c._count.FeeStructure,
      },
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("[GET /api/finance/fee-categories]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// POST /api/finance/fee-categories — Create fee category
// ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles: UserRole[] = ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"];
  if (!allowedRoles.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!session.user.schoolId) {
    return NextResponse.json({ error: "School not found" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const data = createFeeCategorySchema.parse(body);

    // Check if category with same name exists
    const existing = await prisma.feeCategory.findFirst({
      where: {
        name: data.name,
        schoolId: session.user.schoolId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Category with this name already exists" },
        { status: 400 }
      );
    }

    const category = await prisma.feeCategory.create({
      data: {
        id: randomUUID(),
        schoolId: session.user.schoolId,
        name: data.name,
        description: data.description,
        isRecurring: data.isRecurring,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[POST /api/finance/fee-categories]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
