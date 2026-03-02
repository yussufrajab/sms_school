import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

// ─────────────────────────────────────────────
// GET /api/finance/reports — Financial reports
// ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles: UserRole[] = ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"];
  if (!allowedRoles.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const academicYearId = searchParams.get("academicYearId");
  const reportType = searchParams.get("type") || "summary";

  if (!academicYearId) {
    return NextResponse.json({ error: "Academic year is required" }, { status: 400 });
  }

  try {
    // Build base where clause
    const schoolFilter = session.user.role !== "SUPER_ADMIN" && session.user.schoolId
      ? { Student: { schoolId: session.user.schoolId } }
      : {};

    const where = {
      academicYearId,
      deletedAt: null,
      ...schoolFilter,
    };

    if (reportType === "summary") {
      // Get summary statistics
      const [invoices, payments] = await Promise.all([
        prisma.invoice.findMany({
          where,
          select: {
            totalAmount: true,
            paidAmount: true,
            status: true,
          },
        }),
        prisma.payment.findMany({
          where: {
            Invoice: where,
          },
          select: {
            amount: true,
            method: true,
            paidAt: true,
          },
        }),
      ]);

      const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      const totalCollected = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
      const totalPending = totalInvoiced - totalCollected;

      const statusBreakdown = {
        UNPAID: invoices.filter(i => i.status === "UNPAID").length,
        PARTIALLY_PAID: invoices.filter(i => i.status === "PARTIALLY_PAID").length,
        PAID: invoices.filter(i => i.status === "PAID").length,
        OVERDUE: invoices.filter(i => i.status === "OVERDUE").length,
      };

      const paymentMethodBreakdown = payments.reduce((acc, p) => {
        acc[p.method] = (acc[p.method] || 0) + p.amount;
        return acc;
      }, {} as Record<string, number>);

      return NextResponse.json({
        summary: {
          totalInvoiced,
          totalCollected,
          totalPending,
          collectionRate: totalInvoiced > 0 ? ((totalCollected / totalInvoiced) * 100).toFixed(2) : "0",
          invoiceCount: invoices.length,
          paidInvoiceCount: invoices.filter(i => i.status === "PAID").length,
        },
        statusBreakdown,
        paymentMethodBreakdown,
      });
    }

    if (reportType === "defaulters") {
      // Get list of defaulters (students with unpaid/partially paid invoices)
      const overdueInvoices = await prisma.invoice.findMany({
        where: {
          ...where,
          status: { in: ["UNPAID", "PARTIALLY_PAID", "OVERDUE"] },
        },
        include: {
          Student: {
            select: {
              id: true,
              studentId: true,
              firstName: true,
              lastName: true,
              Section: {
                select: {
                  name: true,
                  Class: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: { dueDate: "asc" },
      });

      // Group by student
      const defaultersMap = new Map<string, {
        student: typeof overdueInvoices[0]["Student"];
        totalDue: number;
        invoiceCount: number;
        oldestDueDate: Date;
      }>();

      for (const invoice of overdueInvoices) {
        const studentId = invoice.Student.id;
        const due = invoice.totalAmount - invoice.paidAmount;

        if (defaultersMap.has(studentId)) {
          const existing = defaultersMap.get(studentId)!;
          existing.totalDue += due;
          existing.invoiceCount++;
          if (new Date(invoice.dueDate) < existing.oldestDueDate) {
            existing.oldestDueDate = new Date(invoice.dueDate);
          }
        } else {
          defaultersMap.set(studentId, {
            student: invoice.Student,
            totalDue: due,
            invoiceCount: 1,
            oldestDueDate: new Date(invoice.dueDate),
          });
        }
      }

      const defaulters = Array.from(defaultersMap.values()).sort((a, b) => b.totalDue - a.totalDue);

      return NextResponse.json({
        defaulters,
        total: defaulters.length,
        totalAmount: defaulters.reduce((sum, d) => sum + d.totalDue, 0),
      });
    }

    if (reportType === "monthly") {
      // Get monthly collection data
      const payments = await prisma.payment.findMany({
        where: {
          Invoice: where,
        },
        select: {
          amount: true,
          paidAt: true,
        },
        orderBy: { paidAt: "asc" },
      });

      const monthlyData: Record<string, { month: string; collected: number; count: number }> = {};

      for (const payment of payments) {
        const date = new Date(payment.paidAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const monthName = date.toLocaleString("default", { month: "short", year: "numeric" });

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { month: monthName, collected: 0, count: 0 };
        }
        monthlyData[monthKey].collected += payment.amount;
        monthlyData[monthKey].count++;
      }

      const monthlyCollection = Object.values(monthlyData).sort((a, b) => {
        const [aMonth, bMonth] = [a.month, b.month];
        return aMonth.localeCompare(bMonth);
      });

      return NextResponse.json({ monthlyCollection });
    }

    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  } catch (error) {
    console.error("[GET /api/finance/reports]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
