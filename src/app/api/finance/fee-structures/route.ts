import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

// ─────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────

const createFeeStructureSchema = z.object({
  feeCategoryId: z.string().min(1, "Fee category is required"),
  classId: z.string().optional(), // null means applies to all classes
  academicYearId: z.string().min(1, "Academic year is required"),
  amount: z.number().positive("Amount must be positive"),
  dueDay: z.number().min(1).max(28).optional(), // day of month
});

// ─────────────────────────────────────────────
// GET /api/finance/fee-structures — List fee structures
// ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const academicYearId = searchParams.get("academicYearId");
  const classId = searchParams.get("classId");
  const feeCategoryId = searchParams.get("feeCategoryId");

  try {
    const where: Record<string, unknown> = {};

    if (academicYearId) where.academicYearId = academicYearId;
    if (classId) where.classId = classId;
    if (feeCategoryId) where.feeCategoryId = feeCategoryId;

    // Scope to school for non-super-admins
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      where.FeeCategory = { schoolId: session.user.schoolId };
    }

    const structures = await prisma.feeStructure.findMany({
      where,
      include: {
        FeeCategory: {
          select: { id: true, name: true, isRecurring: true },
        },
        AcademicYear: {
          select: { id: true, name: true },
        },
      },
      orderBy: [
        { FeeCategory: { name: "asc" } },
      ],
    });

    // Fetch class info separately for structures that have classId
    const classIds = structures.filter(s => s.classId).map(s => s.classId as string);
    const classes = classIds.length > 0 ? await prisma.class.findMany({
      where: { id: { in: classIds } },
      select: { id: true, name: true, level: true },
    }) : [];

    const classMap = new Map(classes.map(c => [c.id, c]));

    // Add class info to structures
    const structuresWithClass = structures.map(s => ({
      ...s,
      feeCategory: s.FeeCategory,
      academicYear: s.AcademicYear,
      class: s.classId ? classMap.get(s.classId) || null : null,
    }));

    return NextResponse.json(structuresWithClass);
  } catch (error) {
    console.error("[GET /api/finance/fee-structures]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// POST /api/finance/fee-structures — Create fee structure
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
    const data = createFeeStructureSchema.parse(body);

    // Verify fee category belongs to school
    const feeCategory = await prisma.feeCategory.findFirst({
      where: {
        id: data.feeCategoryId,
        schoolId: session.user.schoolId,
      },
    });

    if (!feeCategory) {
      return NextResponse.json({ error: "Fee category not found" }, { status: 404 });
    }

    // Verify academic year belongs to school
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        id: data.academicYearId,
        schoolId: session.user.schoolId,
      },
    });

    if (!academicYear) {
      return NextResponse.json({ error: "Academic year not found" }, { status: 404 });
    }

    // Verify class belongs to school if provided
    let classRecord = null;
    if (data.classId) {
      classRecord = await prisma.class.findFirst({
        where: {
          id: data.classId,
          schoolId: session.user.schoolId,
        },
        select: { id: true, name: true, level: true },
      });

      if (!classRecord) {
        return NextResponse.json({ error: "Class not found" }, { status: 404 });
      }
    }

    // Check for duplicate
    const existing = await prisma.feeStructure.findFirst({
      where: {
        feeCategoryId: data.feeCategoryId,
        classId: data.classId || null,
        academicYearId: data.academicYearId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Fee structure already exists for this category, class, and academic year" },
        { status: 400 }
      );
    }

    const structure = await prisma.feeStructure.create({
      data: {
        id: randomUUID(),
        feeCategoryId: data.feeCategoryId,
        classId: data.classId || null,
        academicYearId: data.academicYearId,
        amount: data.amount,
        dueDay: data.dueDay,
        updatedAt: new Date(),
      },
      include: {
        FeeCategory: { select: { id: true, name: true } },
        AcademicYear: { select: { id: true, name: true } },
      },
    });

    // Add class info to response and transform for client
    const response = {
      ...structure,
      feeCategory: structure.FeeCategory,
      academicYear: structure.AcademicYear,
      class: classRecord,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[POST /api/finance/fee-structures]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
