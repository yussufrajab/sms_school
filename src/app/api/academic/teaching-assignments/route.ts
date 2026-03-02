import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";

const createAssignmentSchema = z.object({
  staffId: z.string().min(1, "Teacher is required"),
  subjectId: z.string().min(1, "Subject is required"),
  sectionId: z.string().min(1, "Section is required"),
  academicYearId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = session.user.schoolId;
  const { searchParams } = new URL(req.url);
  const academicYearId = searchParams.get("academicYearId");
  const staffId = searchParams.get("staffId");
  const sectionId = searchParams.get("sectionId");

  const where: Record<string, unknown> = {};
  
  if (academicYearId) {
    where.academicYearId = academicYearId;
  }
  if (staffId) {
    where.staffId = staffId;
  }
  if (sectionId) {
    where.sectionId = sectionId;
  }

  // Filter by school through relations
  if (schoolId) {
    where.Staff = { schoolId };
  }

  const assignments = await prisma.teachingAssignment.findMany({
    where,
    include: {
      Staff: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          department: true,
          designation: true,
          User: { select: { email: true, image: true } },
        },
      },
      Subject: {
        select: { id: true, name: true, code: true, type: true },
      },
      Section: {
        select: {
          id: true,
          name: true,
          Class: { select: { id: true, name: true, level: true } },
        },
      },
    },
    orderBy: [
      { Staff: { firstName: "asc" } },
      { Subject: { name: "asc" } },
    ],
  });

  return NextResponse.json(
    assignments.map((a) => ({
      id: a.id,
      staffId: a.staffId,
      subjectId: a.subjectId,
      sectionId: a.sectionId,
      academicYearId: a.academicYearId,
      createdAt: a.createdAt.toISOString(),
      staff: {
        id: a.Staff.id,
        firstName: a.Staff.firstName,
        lastName: a.Staff.lastName,
        employeeId: a.Staff.employeeId,
        department: a.Staff.department,
        designation: a.Staff.designation,
        user: a.Staff.User,
      },
      subject: a.Subject,
      section: {
        id: a.Section.id,
        name: a.Section.name,
        class: a.Section.Class,
      },
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
    const data = createAssignmentSchema.parse(body);

    // Verify staff belongs to school
    const staff = await prisma.staff.findFirst({
      where: { id: data.staffId, schoolId },
    });

    if (!staff) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Verify subject belongs to school
    const subject = await prisma.subject.findFirst({
      where: { id: data.subjectId, schoolId },
    });

    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    // Verify section belongs to school
    const section = await prisma.section.findFirst({
      where: { id: data.sectionId },
      include: { Class: { select: { schoolId: true } } },
    });

    if (!section || section.Class.schoolId !== schoolId) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    // Check for duplicate assignment
    const existing = await prisma.teachingAssignment.findUnique({
      where: {
        staffId_subjectId_sectionId: {
          staffId: data.staffId,
          subjectId: data.subjectId,
          sectionId: data.sectionId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "This teacher is already assigned to this subject and section" },
        { status: 409 }
      );
    }

    const newAssignment = await prisma.teachingAssignment.create({
      data: {
        id: randomUUID(),
        staffId: data.staffId,
        subjectId: data.subjectId,
        sectionId: data.sectionId,
        academicYearId: data.academicYearId,
      },
      include: {
        Staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            department: true,
            designation: true,
            User: { select: { email: true, image: true } },
          },
        },
        Subject: {
          select: { id: true, name: true, code: true, type: true },
        },
        Section: {
          select: {
            id: true,
            name: true,
            Class: { select: { id: true, name: true, level: true } },
          },
        },
      },
    });

    return NextResponse.json(
      {
        id: newAssignment.id,
        staffId: newAssignment.staffId,
        subjectId: newAssignment.subjectId,
        sectionId: newAssignment.sectionId,
        academicYearId: newAssignment.academicYearId,
        createdAt: newAssignment.createdAt.toISOString(),
        staff: {
          id: newAssignment.Staff.id,
          firstName: newAssignment.Staff.firstName,
          lastName: newAssignment.Staff.lastName,
          employeeId: newAssignment.Staff.employeeId,
          department: newAssignment.Staff.department,
          designation: newAssignment.Staff.designation,
          user: newAssignment.Staff.User,
        },
        subject: newAssignment.Subject,
        section: {
          id: newAssignment.Section.id,
          name: newAssignment.Section.name,
          class: newAssignment.Section.Class,
        },
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

  // Check if assignment exists and belongs to school
  const existing = await prisma.teachingAssignment.findFirst({
    where: { id },
    include: { Staff: { select: { schoolId: true } } },
  });

  if (!existing || existing.Staff.schoolId !== schoolId) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  await prisma.teachingAssignment.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
