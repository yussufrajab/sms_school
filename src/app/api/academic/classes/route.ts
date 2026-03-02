import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";

const createClassSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  level: z.number().int().min(1),
  description: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = session.user.schoolId;

  const classes = await prisma.class.findMany({
    where: schoolId ? { schoolId } : {},
    include: {
      Section: {
        include: {
          _count: { select: { Student: true } },
        },
      },
      _count: { select: { Section: true } },
    },
    orderBy: { level: "asc" },
  });

  return NextResponse.json(classes);
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
    const data = createClassSchema.parse(body);

    const newClass = await prisma.class.create({
      data: {
        id: randomUUID(),
        schoolId,
        name: data.name,
        level: data.level,
        description: data.description,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(newClass, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
