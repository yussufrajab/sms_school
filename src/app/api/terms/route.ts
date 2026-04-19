import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const academicYearId = searchParams.get("academicYearId");

  try {
    const where: Record<string, unknown> = {};

    if (academicYearId) {
      where.academicYearId = academicYearId;
    }

    // If user is school-scoped, only show terms for their school
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      where.AcademicYear = { schoolId: session.user.schoolId };
    }

    const terms = await prisma.term.findMany({
      where,
      select: {
        id: true,
        name: true,
        academicYearId: true,
      },
      orderBy: { startDate: "asc" },
    });

    return NextResponse.json(terms);
  } catch (error) {
    console.error("[GET /api/terms]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}