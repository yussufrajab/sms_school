import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSectionSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  maxCapacity: z.number().int().min(1).optional(),
  classId: z.string().min(1, "Class is required").optional(),
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
    const data = updateSectionSchema.parse(body);

    const existing = await prisma.section.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    const updated = await prisma.section.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
      include: {
        Class: true,
        _count: { select: { Student: true } },
      },
    });

    // Transform to lowercase for client compatibility
    const transformed = {
      ...updated,
      class: updated.Class,
      _count: { students: updated._count.Student },
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

    const existing = await prisma.section.findUnique({
      where: { id },
      include: { _count: { select: { Student: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    if (existing._count.Student > 0) {
      return NextResponse.json(
        { error: "Cannot delete section with enrolled students" },
        { status: 400 }
      );
    }

    await prisma.section.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}