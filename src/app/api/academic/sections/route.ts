import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";

const createSectionSchema = z.object({
  classId: z.string().min(1, "Class is required"),
  name: z.string().min(1, "Section name is required"),
  maxCapacity: z.number().int().min(1).default(40),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = session.user.schoolId;
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");

  const sections = await prisma.section.findMany({
    where: {
      ...(schoolId ? { Class: { schoolId } } : {}),
      ...(classId ? { classId } : {}),
    },
    include: {
      Class: true,
      _count: { select: { Student: true } },
    },
    orderBy: [{ Class: { level: "asc" } }, { name: "asc" }],
  });

  return NextResponse.json(sections);
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

  try {
    const body = await req.json();
    const data = createSectionSchema.parse(body);

    const newSection = await prisma.section.create({
      data: {
        id: randomUUID(),
        classId: data.classId,
        name: data.name,
        maxCapacity: data.maxCapacity,
        updatedAt: new Date(),
      },
      include: { Class: true },
    });

    return NextResponse.json(newSection, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
