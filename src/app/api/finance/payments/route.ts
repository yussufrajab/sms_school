import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

// ─────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────

const recordPaymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  amount: z.number().positive("Payment amount must be positive"),
  method: z.enum(["CASH", "BANK_TRANSFER", "STRIPE", "PAYSTACK"]),
  transactionId: z.string().optional(),
  notes: z.string().optional(),
  paidAt: z.string().optional(), // ISO date string; defaults to now
});

// ─────────────────────────────────────────────
// Helper: Derive invoice status from paid vs total amounts
// ─────────────────────────────────────────────

function deriveInvoiceStatus(
  totalAmount: number,
  newPaidAmount: number
): "UNPAID" | "PARTIALLY_PAID" | "PAID" {
  if (newPaidAmount <= 0) return "UNPAID";
  if (newPaidAmount >= totalAmount) return "PAID";
  return "PARTIALLY_PAID";
}

// ─────────────────────────────────────────────
// GET /api/finance/payments — List payments (optional filter by invoiceId)
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
  const invoiceId = searchParams.get("invoiceId");
  const studentId = searchParams.get("studentId");
  const method = searchParams.get("method");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));

  const where: Record<string, unknown> = {};

  if (invoiceId) where.invoiceId = invoiceId;
  if (method) {
    where.method = method as "CASH" | "BANK_TRANSFER" | "STRIPE" | "PAYSTACK";
  }

  // Scope to school via invoice → student → school
  if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
    where.invoice = {
      student: { schoolId: session.user.schoolId },
      ...(studentId ? { studentId } : {}),
    };
  } else if (studentId) {
    where.invoice = { studentId };
  }

  try {
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { paidAt: "desc" },
        include: {
          Invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
              paidAmount: true,
              status: true,
              Student: {
                select: {
                  id: true,
                  studentId: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    // Transform for client compatibility
    const transformed = payments.map(p => ({
      ...p,
      invoice: {
        ...p.Invoice,
        student: p.Invoice.Student,
      },
    }));

    return NextResponse.json({
      data: transformed,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/finance/payments]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// POST /api/finance/payments — Record a payment for an invoice
// ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles: UserRole[] = ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"];
  if (!allowedRoles.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = recordPaymentSchema.parse(body);

    // Fetch the invoice with its current state
    const invoice = await prisma.invoice.findUnique({
      where: { id: data.invoiceId },
      include: {
        Student: { select: { schoolId: true } },
        Payment: { select: { amount: true } },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.deletedAt) {
      return NextResponse.json({ error: "Invoice has been deleted" }, { status: 409 });
    }

    // Scope check
    if (
      session.user.role !== "SUPER_ADMIN" &&
      invoice.Student.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prevent payment on an already fully paid invoice
    if (invoice.status === "PAID") {
      return NextResponse.json(
        { error: "This invoice is already fully paid" },
        { status: 409 }
      );
    }

    // Calculate the current total paid from all existing payments
    const currentPaidAmount = invoice.Payment.reduce(
      (sum: number, p: { amount: number }) => sum + p.amount,
      0
    );

    const remainingBalance = invoice.totalAmount - currentPaidAmount;

    // Prevent overpayment
    if (data.amount > remainingBalance + 0.001) {
      return NextResponse.json(
        {
          error: "Payment amount exceeds the remaining balance",
          remainingBalance: Math.max(0, remainingBalance),
        },
        { status: 400 }
      );
    }

    // Compute new paid total and derive the new invoice status
    const newPaidAmount = currentPaidAmount + data.amount;
    const newStatus = deriveInvoiceStatus(invoice.totalAmount, newPaidAmount);

    // Record payment and update invoice atomically
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          id: randomUUID(),
          invoiceId: data.invoiceId,
          amount: data.amount,
          method: data.method,
          transactionId: data.transactionId,
          notes: data.notes,
          paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
          recordedBy: session.user.id,
        },
      });

      const updatedInvoice = await tx.invoice.update({
        where: { id: data.invoiceId },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
        },
        select: {
          id: true,
          invoiceNumber: true,
          totalAmount: true,
          paidAmount: true,
          status: true,
          dueDate: true,
          Student: {
            select: {
              id: true,
              studentId: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return { payment, invoice: updatedInvoice };
    });

    return NextResponse.json(
      {
        message: "Payment recorded successfully",
        payment: result.payment,
        invoice: result.invoice,
        summary: {
          amountPaid: data.amount,
          totalPaid: newPaidAmount,
          totalAmount: invoice.totalAmount,
          remainingBalance: Math.max(0, invoice.totalAmount - newPaidAmount),
          newStatus,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[POST /api/finance/payments]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
