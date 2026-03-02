import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { generateEmployeeId } from "@/lib/utils";
import { randomUUID } from "crypto";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

// ─────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────

const createStaffSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  department: z.string().optional(),
  designation: z.string().optional(),
  employmentType: z
    .enum(["FULL_TIME", "PART_TIME", "CONTRACT"])
    .default("FULL_TIME"),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  nationality: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  qualifications: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z
    .enum([
      "TEACHER",
      "SCHOOL_ADMIN",
      "ACCOUNTANT",
      "LIBRARIAN",
      "RECEPTIONIST",
      "IT_ADMIN",
    ])
    .default("TEACHER"),
});

// ─────────────────────────────────────────────
// GET /api/staff — List staff with pagination & search
// ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles: UserRole[] = ["SUPER_ADMIN", "SCHOOL_ADMIN", "IT_ADMIN"];
  if (!allowedRoles.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
  const search = searchParams.get("search") ?? "";
  const department = searchParams.get("department") ?? "";
  const employmentType = searchParams.get("employmentType") ?? "";
  const isActive = searchParams.get("isActive");

  const where = {
    ...(session.user.schoolId ? { schoolId: session.user.schoolId } : {}),
    ...(department ? { department: { contains: department, mode: "insensitive" as const } } : {}),
    ...(employmentType
      ? { employmentType: employmentType as "FULL_TIME" | "PART_TIME" | "CONTRACT" }
      : {}),
    ...(isActive !== null && isActive !== ""
      ? { isActive: isActive === "true" }
      : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
            { employeeId: { contains: search, mode: "insensitive" as const } },
            { department: { contains: search, mode: "insensitive" as const } },
            { designation: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    deletedAt: null,
  };

  try {
    const [staff, total] = await Promise.all([
      prisma.staff.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          User: {
            select: {
              id: true,
              email: true,
              role: true,
              isActive: true,
              lastLoginAt: true,
            },
          },
        },
      }),
      prisma.staff.count({ where }),
    ]);

    return NextResponse.json({
      data: staff,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/staff]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// POST /api/staff — Create staff with user account
// ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles: UserRole[] = ["SUPER_ADMIN", "SCHOOL_ADMIN"];
  if (!allowedRoles.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const schoolId = session.user.schoolId;
  if (!schoolId) {
    return NextResponse.json(
      { error: "No school associated with this account" },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const data = createStaffSchema.parse(body);

    // Check for duplicate email
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    // Generate unique employee ID: EMP-{YEAR}-{SEQ4}
    const year = new Date().getFullYear();
    const staffCount = await prisma.staff.count({ where: { schoolId } });
    let employeeId = generateEmployeeId(staffCount + 1, year);

    // Ensure uniqueness in case of collisions
    let idExists = await prisma.staff.findUnique({ where: { employeeId } });
    let seq = staffCount + 2;
    while (idExists) {
      employeeId = generateEmployeeId(seq, year);
      idExists = await prisma.staff.findUnique({ where: { employeeId } });
      seq++;
    }

    // Hash password with bcrypt cost factor 12
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Create user + staff in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          id: randomUUID(),
          email: data.email,
          name: `${data.firstName} ${data.lastName}`,
          password: hashedPassword,
          role: data.role as UserRole,
          schoolId,
          isActive: true,
          updatedAt: new Date(),
        },
      });

      const staff = await tx.staff.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          schoolId,
          employeeId,
          firstName: data.firstName,
          lastName: data.lastName,
          department: data.department,
          designation: data.designation,
          employmentType: data.employmentType,
          phone: data.phone,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
          gender: data.gender,
          nationality: data.nationality,
          address: data.address,
          emergencyContact: data.emergencyContact,
          qualifications: data.qualifications,
          isActive: true,
          updatedAt: new Date(),
        },
        include: {
          User: {
            select: {
              id: true,
              email: true,
              role: true,
              isActive: true,
            },
          },
        },
      });

      return staff;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[POST /api/staff]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
