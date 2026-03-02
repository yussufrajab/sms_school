import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";

type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT" | "LIBRARIAN" | "RECEPTIONIST" | "IT_ADMIN";

// ─────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────

const invoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.number().positive("Amount must be positive"),
  discount: z.number().min(0, "Discount cannot be negative").default(0),
  feeStructureId: z.string().optional(),
});

const createInvoiceSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  academicYearId: z.string().min(1, "Academic year ID is required"),
  items: z
    .array(invoiceItemSchema)
    .min(1, "At least one invoice item is required"),
  dueDate: z.string().min(1, "Due date is required"),
  notes: z.string().optional(),
});

// ─────────────────────────────────────────────
// Helper: Generate invoice number INV-{YEAR}-{SEQ5}
// ─────────────────────────────────────────────

async function generateInvoiceNumber(schoolId: string): Promise<string> {
  const year = new Date().getFullYear();

  // Count invoices for this school's students in the current year
  const count = await prisma.invoice.count({
    where: {
      Student: { schoolId },
      createdAt: {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
      },
    },
  });

  let invoiceNumber = `INV-${year}-${String(count + 1).padStart(5, "0")}`;

  // Ensure uniqueness
  let exists = await prisma.invoice.findUnique({ where: { invoiceNumber } });
  let seq = count + 2;
  while (exists) {
    invoiceNumber = `INV-${year}-${String(seq).padStart(5, "0")}`;
    exists = await prisma.invoice.findUnique({ where: { invoiceNumber } });
    seq++;
  }

  return invoiceNumber;
}

// ─────────────────────────────────────────────
// GET /api/finance/invoices — List invoices with filters
// Filters: studentId, status, academicYearId, page, limit
// ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles: UserRole[] = [
    "SUPER_ADMIN",
    "SCHOOL_ADMIN",
    "ACCOUNTANT",
  ];

  // Parents can view their own children's invoices; students can view their own
  const isParentOrStudent =
    session.user.role === "PARENT" || session.user.role === "STUDENT";

  if (!allowedRoles.includes(session.user.role as UserRole) && !isParentOrStudent) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");
  const status = searchParams.get("status");
  const academicYearId = searchParams.get("academicYearId");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));

  const where: Record<string, unknown> = { deletedAt: null };

  if (studentId) where.studentId = studentId;
  if (academicYearId) where.academicYearId = academicYearId;
  if (status) {
    where.status = status as "UNPAID" | "PARTIALLY_PAID" | "PAID" | "OVERDUE";
  }

  // Scope to school for non-super-admins
  if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId) {
    where.Student = { schoolId: session.user.schoolId };
  }

  // Students can only see their own invoices
  if (session.user.role === "STUDENT") {
    const studentRecord = await prisma.student.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!studentRecord) {
      return NextResponse.json({ error: "Student record not found" }, { status: 404 });
    }
    where.studentId = studentRecord.id;
  }

  // Parents can only see their children's invoices
  if (session.user.role === "PARENT") {
    const parentRecord = await prisma.parent.findFirst({
      where: { userId: session.user.id },
      select: { id: true, StudentParent: { select: { studentId: true } } },
    });
    if (!parentRecord) {
      return NextResponse.json({ error: "Parent record not found" }, { status: 404 });
    }
    const childIds = parentRecord.StudentParent.map((s: { studentId: string }) => s.studentId);
    // If a specific studentId was requested, verify it belongs to this parent
    if (studentId && !childIds.includes(studentId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!studentId) {
      where.studentId = { in: childIds };
    }
  }

  try {
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          Student: {
            select: {
              id: true,
              studentId: true,
              firstName: true,
              lastName: true,
              photoUrl: true,
              Section: {
                select: {
                  name: true,
                  Class: { select: { name: true } },
                },
              },
            },
          },
          AcademicYear: {
            select: { id: true, name: true },
          },
          InvoiceItem: true,
          _count: { select: { Payment: true } },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    return NextResponse.json({
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/finance/invoices]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// POST /api/finance/invoices — Create a new invoice
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
    const data = createInvoiceSchema.parse(body);

    // Verify student exists and belongs to the correct school
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
      select: { id: true, schoolId: true, firstName: true, lastName: true },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (
      session.user.role !== "SUPER_ADMIN" &&
      student.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify academic year exists and belongs to the same school
    const academicYear = await prisma.academicYear.findUnique({
      where: { id: data.academicYearId },
      select: { id: true, schoolId: true },
    });

    if (!academicYear) {
      return NextResponse.json({ error: "Academic year not found" }, { status: 404 });
    }

    if (academicYear.schoolId !== student.schoolId) {
      return NextResponse.json(
        { error: "Academic year does not belong to the student's school" },
        { status: 400 }
      );
    }

    // Calculate total amount from items (amount - discount = netAmount per item)
    const processedItems = data.items.map((item) => ({
      description: item.description,
      amount: item.amount,
      discount: item.discount,
      netAmount: Math.max(0, item.amount - item.discount),
      feeStructureId: item.feeStructureId ?? null,
    }));

    const totalAmount = processedItems.reduce(
      (sum, item) => sum + item.netAmount,
      0
    );

    // Generate unique invoice number
    const invoiceNumber = await generateInvoiceNumber(student.schoolId);

    // Create invoice with items in a transaction
    const invoice = await prisma.$transaction(async (tx) => {
      return tx.invoice.create({
        data: {
          id: randomUUID(),
          invoiceNumber,
          studentId: data.studentId,
          academicYearId: data.academicYearId,
          totalAmount,
          paidAmount: 0,
          dueDate: new Date(data.dueDate),
          status: "UNPAID",
          notes: data.notes,
          updatedAt: new Date(),
          InvoiceItem: {
            create: processedItems.map((item) => ({
              id: randomUUID(),
              description: item.description,
              amount: item.amount,
              discount: item.discount,
              netAmount: item.netAmount,
              feeStructureId: item.feeStructureId,
            })),
          },
        },
        include: {
          Student: {
            select: {
              id: true,
              studentId: true,
              firstName: true,
              lastName: true,
            },
          },
          AcademicYear: {
            select: { id: true, name: true },
          },
          InvoiceItem: true,
        },
      });
    });

    // Transform for client compatibility
    const transformedInvoice = {
      ...invoice,
      student: invoice.Student,
      academicYear: invoice.AcademicYear,
      items: invoice.InvoiceItem,
    };

    return NextResponse.json(transformedInvoice, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[POST /api/finance/invoices]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
