import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateClassSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  level: z.number().int().min(1).optional(),
  description: z.string().nullable().optional(),
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
    const data = updateClassSchema.parse(body);

    const existing = await prisma.class.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const updated = await prisma.class.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
      include: {
        Section: { include: { _count: { select: { Student: true } } } },
        _count: { select: { Section: true } },
      },
    });

    return NextResponse.json(updated);
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

    const existing = await prisma.class.findUnique({
      where: { id },
      include: { Section: { include: { _count: { select: { Student: true } } } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Check if class has students
    const totalStudents = existing.Section.reduce(
      (sum, s) => sum + s._count.Student,
      0
    );
    if (totalStudents > 0) {
      return NextResponse.json(
        { error: "Cannot delete class with enrolled students" },
        { status: 400 }
      );
    }

    await prisma.class.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}