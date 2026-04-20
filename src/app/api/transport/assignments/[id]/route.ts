import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

// ─────────────────────────────────────────────
// DELETE /api/transport/assignments/[id] — Remove assignment
// ─────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles: UserRole[] = ["SUPER_ADMIN", "SCHOOL_ADMIN"];
  if (!allowedRoles.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const assignment = await prisma.studentTransport.findUnique({
      where: { id },
      include: {
        Student: { select: { schoolId: true } },
        Route: { select: { schoolId: true } },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    // Verify school access for non-super-admins
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
      if (assignment.Student.schoolId !== session.user.schoolId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    await prisma.studentTransport.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Assignment removed successfully" });
  } catch (error) {
    console.error("[DELETE /api/transport/assignments/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}