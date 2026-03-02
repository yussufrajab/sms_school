import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

// ─────────────────────────────────────────────
// GET /api/audit-logs — List audit logs with pagination & filtering
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
  const userId = searchParams.get("userId") ?? "";
  const action = searchParams.get("action") ?? "";
  const entityType = searchParams.get("entityType") ?? "";
  const entityId = searchParams.get("entityId") ?? "";
  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? "";
  const search = searchParams.get("search") ?? "";

  const where = {
    ...(session.user.schoolId ? { schoolId: session.user.schoolId } : {}),
    ...(userId ? { userId } : {}),
    ...(action ? { action: action as "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "LOGIN_FAILED" | "PASSWORD_RESET" | "MFA_ENABLED" | "MFA_DISABLED" | "SESSION_REVOKED" | "FILE_UPLOAD" | "FILE_DELETE" | "EXPORT" } : {}),
    ...(entityType ? { entityType: { contains: entityType, mode: "insensitive" as const } } : {}),
    ...(entityId ? { entityId } : {}),
    ...(startDate || endDate
      ? {
          createdAt: {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate ? { lte: new Date(endDate) } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { entityType: { contains: search, mode: "insensitive" as const } },
            { entityId: { contains: search, mode: "insensitive" as const } },
            { User: { name: { contains: search, mode: "insensitive" as const } } },
            { User: { email: { contains: search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  try {
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          User: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Get unique values for filters
    const [entityTypes, actions] = await Promise.all([
      prisma.auditLog.groupBy({
        by: ["entityType"],
        where: { schoolId: session.user.schoolId ?? undefined },
        _count: true,
      }),
      prisma.auditLog.groupBy({
        by: ["action"],
        where: { schoolId: session.user.schoolId ?? undefined },
        _count: true,
      }),
    ]);

    return NextResponse.json({
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        entityTypes: entityTypes.filter(e => e.entityType).map(e => e.entityType),
        actions: actions.map(a => a.action),
      },
    });
  } catch (error) {
    console.error("[GET /api/audit-logs]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
