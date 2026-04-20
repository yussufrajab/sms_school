import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

// ─────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────

const assignTransportSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  routeId: z.string().min(1, "Route is required"),
  stopName: z.string().min(1, "Stop name is required"),
  isActive: z.boolean().default(true),
});

// ─────────────────────────────────────────────
// GET /api/transport/assignments — List assignments
// ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const routeId = searchParams.get("routeId");

  try {
    const where: Record<string, unknown> = {};

    if (routeId) where.routeId = routeId;

    // For students, show only their own assignment
    if (session.user.role === "STUDENT") {
      const student = await prisma.student.findFirst({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (!student) {
        return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
      }
      where.studentId = student.id;
    }

    // For parents, show their children's assignments
    if (session.user.role === "PARENT") {
      const parent = await prisma.parent.findFirst({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (!parent) {
        return NextResponse.json({ error: "Parent profile not found" }, { status: 404 });
      }

      const studentParents = await prisma.studentParent.findMany({
        where: { parentId: parent.id },
        select: { studentId: true },
      });
      where.studentId = { in: studentParents.map((sp) => sp.studentId) };
    }

    const assignments = await prisma.studentTransport.findMany({
      where,
      include: {
        Student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentId: true,
            schoolId: true,
            Section: {
              select: { id: true, name: true, Class: { select: { id: true, name: true } } },
            },
          },
        },
        Route: {
          select: {
            id: true,
            name: true,
            code: true,
            startPoint: true,
            endPoint: true,
            Vehicle: {
              select: {
                id: true,
                registration: true,
                Driver: { select: { id: true, firstName: true, lastName: true, phone: true } },
              },
            },
          },
        },
      },
      orderBy: { Student: { firstName: "asc" } },
    });

    // Filter by school for non-super-admins
    let filteredAssignments = assignments;
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      filteredAssignments = assignments.filter(
        (a) => a.Student.schoolId === session.user.schoolId
      );
    }

    // Transform to match frontend expected format
    const transformedAssignments = filteredAssignments.map((assignment) => ({
      id: assignment.id,
      stopName: assignment.stopName,
      isActive: assignment.isActive,
      student: {
        id: assignment.Student.id,
        firstName: assignment.Student.firstName,
        lastName: assignment.Student.lastName,
        studentId: assignment.Student.studentId,
        section: assignment.Student.Section
          ? {
              id: assignment.Student.Section.id,
              name: assignment.Student.Section.name,
              class: assignment.Student.Section.Class,
            }
          : null,
      },
      route: {
        id: assignment.Route.id,
        name: assignment.Route.name,
        code: assignment.Route.code,
        startPoint: assignment.Route.startPoint,
        endPoint: assignment.Route.endPoint,
        vehicle: assignment.Route.Vehicle
          ? {
              id: assignment.Route.Vehicle.id,
              registration: assignment.Route.Vehicle.registration,
              driver: assignment.Route.Vehicle.Driver
                ? {
                    id: assignment.Route.Vehicle.Driver.id,
                    firstName: assignment.Route.Vehicle.Driver.firstName,
                    lastName: assignment.Route.Vehicle.Driver.lastName,
                    phone: assignment.Route.Vehicle.Driver.phone,
                  }
                : null,
            }
          : null,
      },
    }));

    return NextResponse.json(transformedAssignments);
  } catch (error) {
    console.error("[GET /api/transport/assignments]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// POST /api/transport/assignments — Assign transport
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

  if (!session.user.schoolId) {
    return NextResponse.json({ error: "School not found" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const data = assignTransportSchema.parse(body);

    // Verify student belongs to school
    const student = await prisma.student.findFirst({
      where: { id: data.studentId, schoolId: session.user.schoolId },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Verify route belongs to school
    const route = await prisma.route.findFirst({
      where: { id: data.routeId, schoolId: session.user.schoolId },
    });

    if (!route) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    // Verify stop exists in route
    const stops = route.stops as Array<{ name: string; estimatedTime: string }>;
    if (!stops.find((s) => s.name === data.stopName)) {
      return NextResponse.json(
        { error: "Stop not found in this route" },
        { status: 400 }
      );
    }

    // Check if student already has transport assignment
    const existing = await prisma.studentTransport.findUnique({
      where: { studentId: data.studentId },
    });

    if (existing) {
      // Update existing assignment
      const assignment = await prisma.studentTransport.update({
        where: { studentId: data.studentId },
        data: {
          routeId: data.routeId,
          stopName: data.stopName,
          isActive: data.isActive,
        },
        include: {
          Student: {
            select: { id: true, firstName: true, lastName: true, studentId: true },
          },
          Route: {
            select: { id: true, name: true, code: true },
          },
        },
      });
      return NextResponse.json(assignment);
    }

    // Create new assignment
    const assignment = await prisma.studentTransport.create({
      data: {
        id: randomUUID(),
        studentId: data.studentId,
        routeId: data.routeId,
        stopName: data.stopName,
        isActive: data.isActive,
        updatedAt: new Date(),
      },
      include: {
        Student: {
          select: { id: true, firstName: true, lastName: true, studentId: true },
        },
        Route: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[POST /api/transport/assignments]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
