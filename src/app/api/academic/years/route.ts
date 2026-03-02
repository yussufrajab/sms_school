import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";

const createYearSchema = z.object({
  name: z.string().min(1, "Name is required"),
  startDate: z.string().transform((v) => new Date(v)),
  endDate: z.string().transform((v) => new Date(v)),
  isCurrent: z.boolean().optional().default(false),
});

const updateYearSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  startDate: z.string().transform((v) => new Date(v)).optional(),
  endDate: z.string().transform((v) => new Date(v)).optional(),
  isCurrent: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = session.user.schoolId;

  const years = await prisma.academicYear.findMany({
    where: schoolId ? { schoolId } : {},
    include: {
      _count: { select: { Term: true, Exam: true } },
    },
    orderBy: { startDate: "desc" },
  });

  return NextResponse.json(
    years.map((y) => ({
      id: y.id,
      name: y.name,
      startDate: y.startDate.toISOString(),
      endDate: y.endDate.toISOString(),
      isCurrent: y.isCurrent,
      createdAt: y.createdAt.toISOString(),
      updatedAt: y.updatedAt.toISOString(),
      _count: { terms: y._count.Term, exams: y._count.Exam },
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN"];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const schoolId = session.user.schoolId;
  if (!schoolId) {
    return NextResponse.json({ error: "No school associated" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const data = createYearSchema.parse(body);

    // Validate dates
    if (data.startDate >= data.endDate) {
      return NextResponse.json(
        { error: "Start date must be before end date" },
        { status: 400 }
      );
    }

    // Check for overlapping years
    const overlapping = await prisma.academicYear.findFirst({
      where: {
        schoolId,
        OR: [
          {
            startDate: { lte: data.endDate },
            endDate: { gte: data.startDate },
          },
        ],
      },
    });

    if (overlapping) {
      return NextResponse.json(
        { error: "Academic year dates overlap with existing year" },
        { status: 409 }
      );
    }

    // If setting as current, unset other current years
    if (data.isCurrent) {
      await prisma.academicYear.updateMany({
        where: { schoolId, isCurrent: true },
        data: { isCurrent: false, updatedAt: new Date() },
      });
    }

    const newYear = await prisma.academicYear.create({
      data: {
        id: randomUUID(),
        schoolId,
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        isCurrent: data.isCurrent,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        ...newYear,
        startDate: newYear.startDate.toISOString(),
        endDate: newYear.endDate.toISOString(),
        createdAt: newYear.createdAt.toISOString(),
        updatedAt: newYear.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN"];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const schoolId = session.user.schoolId;
  if (!schoolId) {
    return NextResponse.json({ error: "No school associated" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const updateData = updateYearSchema.parse(data);

    // Check if year exists and belongs to school
    const existing = await prisma.academicYear.findFirst({
      where: { id, schoolId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Academic year not found" }, { status: 404 });
    }

    // Validate dates if provided
    const startDate = updateData.startDate || existing.startDate;
    const endDate = updateData.endDate || existing.endDate;
    if (startDate >= endDate) {
      return NextResponse.json(
        { error: "Start date must be before end date" },
        { status: 400 }
      );
    }

    // If setting as current, unset other current years
    if (updateData.isCurrent) {
      await prisma.academicYear.updateMany({
        where: { schoolId, isCurrent: true, id: { not: id } },
        data: { isCurrent: false, updatedAt: new Date() },
      });
    }

    const updated = await prisma.academicYear.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      ...updated,
      startDate: updated.startDate.toISOString(),
      endDate: updated.endDate.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN"];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const schoolId = session.user.schoolId;
  if (!schoolId) {
    return NextResponse.json({ error: "No school associated" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  // Check if year exists and belongs to school
  const existing = await prisma.academicYear.findFirst({
    where: { id, schoolId },
    include: { _count: { select: { Term: true, Exam: true, Invoice: true } } },
  });

  if (!existing) {
    return NextResponse.json({ error: "Academic year not found" }, { status: 404 });
  }

  // Prevent deletion if year has related records
  if (existing._count.Term > 0 || existing._count.Exam > 0 || existing._count.Invoice > 0) {
    return NextResponse.json(
      { error: "Cannot delete academic year with associated terms, exams, or invoices" },
      { status: 400 }
    );
  }

  await prisma.academicYear.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
