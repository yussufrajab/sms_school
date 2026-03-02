import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";

const createTermSchema = z.object({
  academicYearId: z.string().min(1, "Academic year is required"),
  name: z.string().min(1, "Name is required"),
  startDate: z.string().transform((v) => new Date(v)),
  endDate: z.string().transform((v) => new Date(v)),
});

const updateTermSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  startDate: z.string().transform((v) => new Date(v)).optional(),
  endDate: z.string().transform((v) => new Date(v)).optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = session.user.schoolId;
  const { searchParams } = new URL(req.url);
  const academicYearId = searchParams.get("academicYearId");

  const where: Record<string, unknown> = {};
  if (academicYearId) {
    where.academicYearId = academicYearId;
  }
  if (schoolId) {
    where.AcademicYear = { schoolId };
  }

  const terms = await prisma.term.findMany({
    where,
    include: {
      AcademicYear: {
        select: { id: true, name: true, isCurrent: true },
      },
      _count: { select: { Exam: true } },
    },
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json(
    terms.map((t) => ({
      id: t.id,
      name: t.name,
      startDate: t.startDate.toISOString(),
      endDate: t.endDate.toISOString(),
      academicYearId: t.academicYearId,
      academicYear: t.AcademicYear,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      _count: { exams: t._count.Exam },
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
    const data = createTermSchema.parse(body);

    // Verify academic year belongs to school
    const academicYear = await prisma.academicYear.findFirst({
      where: { id: data.academicYearId, schoolId },
    });

    if (!academicYear) {
      return NextResponse.json(
        { error: "Academic year not found" },
        { status: 404 }
      );
    }

    // Validate dates
    if (data.startDate >= data.endDate) {
      return NextResponse.json(
        { error: "Start date must be before end date" },
        { status: 400 }
      );
    }

    // Check if term dates are within academic year
    if (data.startDate < academicYear.startDate || data.endDate > academicYear.endDate) {
      return NextResponse.json(
        { error: "Term dates must be within academic year dates" },
        { status: 400 }
      );
    }

    // Check for overlapping terms
    const overlapping = await prisma.term.findFirst({
      where: {
        academicYearId: data.academicYearId,
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
        { error: "Term dates overlap with existing term" },
        { status: 409 }
      );
    }

    const newTerm = await prisma.term.create({
      data: {
        id: randomUUID(),
        academicYearId: data.academicYearId,
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        updatedAt: new Date(),
      },
      include: {
        AcademicYear: {
          select: { id: true, name: true, isCurrent: true },
        },
      },
    });

    return NextResponse.json(
      {
        ...newTerm,
        startDate: newTerm.startDate.toISOString(),
        endDate: newTerm.endDate.toISOString(),
        createdAt: newTerm.createdAt.toISOString(),
        updatedAt: newTerm.updatedAt.toISOString(),
        academicYear: newTerm.AcademicYear,
        _count: { exams: 0 },
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

    const updateData = updateTermSchema.parse(data);

    // Check if term exists and belongs to school
    const existing = await prisma.term.findFirst({
      where: { id },
      include: { AcademicYear: { select: { schoolId: true, startDate: true, endDate: true } } },
    });

    if (!existing || existing.AcademicYear.schoolId !== schoolId) {
      return NextResponse.json({ error: "Term not found" }, { status: 404 });
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

    // Check if term dates are within academic year
    if (startDate < existing.AcademicYear.startDate || endDate > existing.AcademicYear.endDate) {
      return NextResponse.json(
        { error: "Term dates must be within academic year dates" },
        { status: 400 }
      );
    }

    // Check for overlapping terms
    const overlapping = await prisma.term.findFirst({
      where: {
        id: { not: id },
        academicYearId: existing.academicYearId,
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    });

    if (overlapping) {
      return NextResponse.json(
        { error: "Term dates overlap with existing term" },
        { status: 409 }
      );
    }

    const updated = await prisma.term.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      include: {
        AcademicYear: {
          select: { id: true, name: true, isCurrent: true },
        },
      },
    });

    return NextResponse.json({
      ...updated,
      startDate: updated.startDate.toISOString(),
      endDate: updated.endDate.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      academicYear: updated.AcademicYear,
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

  // Check if term exists and belongs to school
  const existing = await prisma.term.findFirst({
    where: { id },
    include: {
      AcademicYear: { select: { schoolId: true } },
      _count: { select: { Exam: true } },
    },
  });

  if (!existing || existing.AcademicYear.schoolId !== schoolId) {
    return NextResponse.json({ error: "Term not found" }, { status: 404 });
  }

  // Prevent deletion if term has exams
  if (existing._count.Exam > 0) {
    return NextResponse.json(
      { error: "Cannot delete term with associated exams" },
      { status: 400 }
    );
  }

  await prisma.term.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
