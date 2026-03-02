import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";

const createSubjectSchema = z.object({
  name: z.string().min(1, "Subject name is required"),
  code: z.string().min(1, "Subject code is required"),
  description: z.string().optional(),
  type: z.enum(["CORE", "ELECTIVE"]).default("CORE"),
  creditHours: z.number().int().min(1).default(1),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = session.user.schoolId;

  const subjects = await prisma.subject.findMany({
    where: schoolId ? { schoolId } : {},
    include: {
      _count: { select: { TeachingAssignment: true, Timetable: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(subjects);
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
    const data = createSubjectSchema.parse(body);

    // Check for duplicate code
    const existing = await prisma.subject.findFirst({
      where: { schoolId, code: data.code },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Subject with code "${data.code}" already exists` },
        { status: 409 }
      );
    }

    const newSubject = await prisma.subject.create({
      data: {
        id: randomUUID(),
        schoolId,
        name: data.name,
        code: data.code,
        description: data.description,
        type: data.type,
        creditHours: data.creditHours,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(newSubject, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
