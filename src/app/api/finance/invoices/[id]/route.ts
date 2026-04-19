import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

// ─────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────

const invoiceItemUpdateSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  amount: z.number().positive("Amount must be positive"),
  discount: z.number().min(0, "Discount cannot be negative").default(0),
});

const updateInvoiceSchema = z.object({
  status: z
    .enum(["UNPAID", "PARTIALLY_PAID", "PAID", "OVERDUE"])
    .optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(invoiceItemUpdateSchema).min(1, "At least one item is required").optional(),
});

// ─────────────────────────────────────────────
// GET /api/finance/invoices/[id] — Fetch single invoice with items and payments
// ─────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        Student: {
          select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            schoolId: true,
            Section: {
              select: {
                id: true,
                name: true,
                Class: { select: { id: true, name: true } },
              },
            },
          },
        },
        AcademicYear: {
          select: { id: true, name: true, startDate: true, endDate: true },
        },
        InvoiceItem: {
          include: {
            FeeStructure: {
              select: {
                id: true,
                amount: true,
                FeeCategory: { select: { id: true, name: true } },
              },
            },
          },
        },
        Payment: {
          orderBy: { paidAt: "desc" },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Access control: admins/accountants see all; students/parents see their own
    const role = session.user.role as UserRole;

    if (role === "STUDENT") {
      const studentRecord = await prisma.student.findFirst({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (!studentRecord || invoice.studentId !== studentRecord.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (role === "PARENT") {
      const parentRecord = await prisma.parent.findFirst({
        where: { userId: session.user.id },
        select: { StudentParent: { select: { studentId: true } } },
      });
      const childIds = parentRecord?.StudentParent.map((s: { studentId: string }) => s.studentId) ?? [];
      if (!childIds.includes(invoice.studentId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      // Staff roles: scope to school
      const allowedRoles: UserRole[] = [
        "SUPER_ADMIN",
        "SCHOOL_ADMIN",
        "ACCOUNTANT",
      ];
      if (!allowedRoles.includes(role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (
        role !== "SUPER_ADMIN" &&
        invoice.Student.schoolId !== session.user.schoolId
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Compute summary fields
    const totalPaid = invoice.Payment.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);
    const balance = invoice.totalAmount - totalPaid;

    return NextResponse.json({
      ...invoice,
      summary: {
        totalAmount: invoice.totalAmount,
        paidAmount: totalPaid,
        balance: Math.max(0, balance),
        itemCount: invoice.InvoiceItem.length,
        paymentCount: invoice.Payment.length,
      },
    });
  } catch (error) {
    console.error("[GET /api/finance/invoices/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// PATCH /api/finance/invoices/[id] — Update invoice status / metadata / items
// ─────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles: UserRole[] = ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"];
  if (!allowedRoles.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.invoice.findUnique({
      where: { id },
      include: {
        Student: { select: { schoolId: true } },
        Payment: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (existing.deletedAt) {
      return NextResponse.json({ error: "Invoice has been deleted" }, { status: 409 });
    }

    if (
      session.user.role !== "SUPER_ADMIN" &&
      existing.Student.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const data = updateInvoiceSchema.parse(body);

    // Check if items can be edited
    if (data.items !== undefined && existing.paidAmount > 0) {
      return NextResponse.json(
        { error: "Cannot edit invoice items after payments have been recorded" },
        { status: 409 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Update items if provided
      if (data.items !== undefined) {
        // Delete existing items
        await tx.invoiceItem.deleteMany({
          where: { invoiceId: id },
        });

        // Create new items
        const processedItems = data.items.map((item) => ({
          id: item.id ?? randomUUID(),
          description: item.description,
          amount: item.amount,
          discount: item.discount ?? 0,
          netAmount: Math.max(0, item.amount - (item.discount ?? 0)),
        }));

        await tx.invoiceItem.createMany({
          data: processedItems.map((item) => ({
            id: item.id,
            invoiceId: id,
            description: item.description,
            amount: item.amount,
            discount: item.discount,
            netAmount: item.netAmount,
          })),
        });
      }

      // Update invoice
      return tx.invoice.update({
        where: { id },
        data: {
          ...(data.status !== undefined && { status: data.status }),
          ...(data.dueDate !== undefined && { dueDate: new Date(data.dueDate) }),
          ...(data.notes !== undefined && { notes: data.notes }),
          ...(data.items !== undefined && {
            totalAmount: data.items.reduce(
              (sum, item) => sum + Math.max(0, item.amount - (item.discount ?? 0)),
              0
            ),
          }),
          updatedAt: new Date(),
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
          AcademicYear: { select: { id: true, name: true } },
          InvoiceItem: true,
          _count: { select: { Payment: true } },
        },
      });
    });

    // Transform for client compatibility
    const transformed = {
      ...updated,
      student: updated.Student,
      academicYear: updated.AcademicYear,
      items: updated.InvoiceItem,
      _count: { payments: updated._count.Payment },
    };

    return NextResponse.json(transformed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[PATCH /api/finance/invoices/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
