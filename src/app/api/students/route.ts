import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { generateStudentId } from "@/lib/utils";
import { randomUUID } from "crypto";

const createStudentSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string(),
  gender: z.string(),
  nationality: z.string().optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  emergencyContact: z.string().optional(),
  sectionId: z.string().optional(),
  email: z.string().email(),
  password: z.string().min(8).optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const sectionId = searchParams.get("sectionId") ?? "";

  const where = {
    ...(session.user.schoolId ? { schoolId: session.user.schoolId } : {}),
    ...(status ? { status: status as "ACTIVE" | "GRADUATED" | "TRANSFERRED" | "SUSPENDED" | "EXPELLED" } : {}),
    ...(sectionId ? { sectionId } : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
            { studentId: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    deletedAt: null,
  };

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        studentId: true,
        gender: true,
        status: true,
        dateOfBirth: true,
        nationality: true,
        bloodGroup: true,
        address: true,
        phone: true,
        emergencyContact: true,
        createdAt: true,
        Section: { select: { name: true, Class: { select: { name: true } } } },
        User: { select: { email: true } },
      },
    }),
    prisma.student.count({ where }),
  ]);

  // Transform to lowercase for client components
  const transformedStudents = students.map(s => ({
    ...s,
    section: s.Section ? {
      name: s.Section.name,
      class: { name: s.Section.Class.name },
    } : null,
    user: s.User ? { email: s.User.email } : null,
  }));

  return NextResponse.json({
    data: transformedStudents,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN", "RECEPTIONIST"];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = createStudentSchema.parse(body);

    const schoolId = session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json({ error: "No school associated" }, { status: 400 });
    }

    // Generate student ID
    const count = await prisma.student.count({ where: { schoolId } });
    const studentId = generateStudentId(count + 1);

    // Create user account
    const hashedPassword = await bcrypt.hash(
      data.password ?? Math.random().toString(36).slice(-8),
      12
    );

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          id: randomUUID(),
          email: data.email,
          name: `${data.firstName} ${data.lastName}`,
          password: hashedPassword,
          role: "STUDENT",
          schoolId,
          updatedAt: new Date(),
        },
      });

      const student = await tx.student.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          schoolId,
          studentId,
          firstName: data.firstName,
          lastName: data.lastName,
          dateOfBirth: new Date(data.dateOfBirth),
          gender: data.gender,
          nationality: data.nationality,
          bloodGroup: data.bloodGroup,
          address: data.address,
          phone: data.phone,
          emergencyContact: data.emergencyContact,
          sectionId: data.sectionId,
          updatedAt: new Date(),
        },
      });

      return student;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
