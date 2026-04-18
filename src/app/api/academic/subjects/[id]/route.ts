import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSubjectSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  code: z.string().min(1, "Code is required").optional(),
  description: z.string().nullable().optional(),
  type: z.enum(["CORE", "ELECTIVE"]).optional(),
  creditHours: z.number().int().min(1).optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN"];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const data = updateSubjectSchema.parse(body);

    const existing = await prisma.subject.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    // Check for duplicate code if being changed
    if (data.code && data.code !== existing.code) {
      const duplicate = await prisma.subject.findFirst({
        where: { schoolId: existing.schoolId, code: data.code, id: { not: id } },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: `Subject with code "${data.code}" already exists` },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.subject.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
      include: {
        _count: { select: { TeachingAssignment: true, Timetable: true } },
      },
    });

    // Transform to lowercase for client
    const transformed = {
      ...updated,
      _count: {
        teachingAssignments: updated._count.TeachingAssignment,
        timetables: updated._count.Timetable,
      },
    };

    return NextResponse.json(transformed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error(error);
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

  const allowedRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN"];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;

    const existing = await prisma.subject.findUnique({
      where: { id },
      include: { _count: { select: { TeachingAssignment: true, Timetable: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    if (existing._count.TeachingAssignment > 0 || existing._count.Timetable > 0) {
      return NextResponse.json(
        { error: "Cannot delete subject with teaching assignments or timetables" },
        { status: 400 }
      );
    }

    await prisma.subject.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}