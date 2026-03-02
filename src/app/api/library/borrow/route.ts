import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";

const FINE_PER_DAY = 0.10; // $0.10 per day overdue
const DEFAULT_LOAN_DAYS = 14;

const issueBorrowSchema = z.object({
  bookCopyId: z.string().min(1, "Book copy ID is required"),
  studentId: z.string().min(1, "Student ID is required"),
  expectedReturn: z.string().datetime().optional(), // ISO string; defaults to 14 days from now
});

const returnBorrowSchema = z.object({
  id: z.string().min(1, "Borrow record ID is required"),
});

function calculateFine(expectedReturn: Date, returnDate: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysOverdue = Math.floor(
    (returnDate.getTime() - expectedReturn.getTime()) / msPerDay
  );
  return daysOverdue > 0 ? Math.round(daysOverdue * FINE_PER_DAY * 100) / 100 : 0;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
  const studentId = searchParams.get("studentId") ?? "";
  const bookCopyId = searchParams.get("bookCopyId") ?? "";
  const isOverdue = searchParams.get("isOverdue"); // "true" | "false" | null
  const returned = searchParams.get("returned"); // "true" | "false" | null

  const now = new Date();

  // Build where clause
  const where: Record<string, unknown> = {
    ...(studentId ? { studentId } : {}),
    ...(bookCopyId ? { bookCopyId } : {}),
  };

  // Filter by returned status
  if (returned === "true") {
    where.returnDate = { not: null };
  } else if (returned === "false") {
    where.returnDate = null;
  }

  // Filter overdue: not returned AND expectedReturn < now
  if (isOverdue === "true") {
    where.returnDate = null;
    where.expectedReturn = { lt: now };
  } else if (isOverdue === "false") {
    where.OR = [
      { returnDate: { not: null } },
      { expectedReturn: { gte: now } },
    ];
  }

  // Students can only see their own records
  if (session.user.role === "STUDENT") {
    const student = await prisma.student.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!student) {
      return NextResponse.json({ data: [], pagination: { page, limit, total: 0, totalPages: 0 } });
    }
    where.studentId = student.id;
  }

  try {
    const [records, total] = await Promise.all([
      prisma.borrowRecord.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { borrowDate: "desc" },
        include: {
          BookCopy: {
            include: {
              Book: {
                select: {
                  id: true,
                  title: true,
                  authors: true,
                  isbn: true,
                  coverUrl: true,
                  category: true,
                  shelfLocation: true,
                },
              },
            },
          },
          Student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              studentId: true,
            },
          },
        },
      }),
      prisma.borrowRecord.count({ where }),
    ]);

    // Annotate each record with computed overdue status and current fine
    const annotated = records.map((record: typeof records[number]) => {
      const isCurrentlyOverdue =
        !record.returnDate && record.expectedReturn < now;
      const currentFine = record.returnDate
        ? record.fineAmount
        : isCurrentlyOverdue
        ? calculateFine(record.expectedReturn, now)
        : 0;

      return { ...record, isOverdue: isCurrentlyOverdue, currentFine };
    });

    return NextResponse.json({
      data: annotated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/library/borrow]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN", "LIBRARIAN"];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = issueBorrowSchema.parse(body);

    // Verify the book copy exists and is available
    const bookCopy = await prisma.bookCopy.findUnique({
      where: { id: data.bookCopyId },
      include: { Book: { select: { title: true, schoolId: true } } },
    });

    if (!bookCopy) {
      return NextResponse.json({ error: "Book copy not found" }, { status: 404 });
    }

    // Enforce school boundary
    if (
      session.user.schoolId &&
      bookCopy.Book.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!bookCopy.isAvailable) {
      return NextResponse.json(
        { error: `Copy "${bookCopy.copyNumber}" of "${bookCopy.Book.title}" is currently not available` },
        { status: 409 }
      );
    }

    // Verify student exists
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
      select: { id: true, firstName: true, lastName: true, schoolId: true },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (session.user.schoolId && student.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if student already has an active borrow for this copy
    const existingBorrow = await prisma.borrowRecord.findFirst({
      where: {
        bookCopyId: data.bookCopyId,
        studentId: data.studentId,
        returnDate: null,
      },
    });

    if (existingBorrow) {
      return NextResponse.json(
        { error: "This student already has an active borrow for this copy" },
        { status: 409 }
      );
    }

    const expectedReturn = data.expectedReturn
      ? new Date(data.expectedReturn)
      : new Date(Date.now() + DEFAULT_LOAN_DAYS * 24 * 60 * 60 * 1000);

    const record = await prisma.$transaction(async (tx) => {
      // Mark copy as unavailable
      await tx.bookCopy.update({
        where: { id: data.bookCopyId },
        data: { isAvailable: false, updatedAt: new Date() },
      });

      // Create borrow record
      return tx.borrowRecord.create({
        data: {
          id: randomUUID(),
          bookCopyId: data.bookCopyId,
          studentId: data.studentId,
          expectedReturn,
          fineAmount: 0,
          finePaid: false,
          updatedAt: new Date(),
        },
        include: {
          BookCopy: {
            include: {
              Book: {
                select: { id: true, title: true, authors: true, isbn: true },
              },
            },
          },
          Student: {
            select: { id: true, firstName: true, lastName: true, studentId: true },
          },
        },
      });
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("[POST /api/library/borrow]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN", "LIBRARIAN"];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id } = returnBorrowSchema.parse(body);

    // Fetch the borrow record
    const borrowRecord = await prisma.borrowRecord.findUnique({
      where: { id },
      include: {
        BookCopy: {
          include: { Book: { select: { schoolId: true, title: true } } },
        },
      },
    });

    if (!borrowRecord) {
      return NextResponse.json({ error: "Borrow record not found" }, { status: 404 });
    }

    // Enforce school boundary
    if (
      session.user.schoolId &&
      borrowRecord.BookCopy.Book.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (borrowRecord.returnDate) {
      return NextResponse.json(
        { error: "This book has already been returned" },
        { status: 409 }
      );
    }

    const returnDate = new Date();
    const fineAmount = calculateFine(borrowRecord.expectedReturn, returnDate);

    const updated = await prisma.$transaction(async (tx) => {
      // Update borrow record with return date and fine
      const updatedRecord = await tx.borrowRecord.update({
        where: { id },
        data: {
          returnDate,
          fineAmount,
        },
        include: {
          BookCopy: {
            include: {
              Book: {
                select: { id: true, title: true, authors: true, isbn: true },
              },
            },
          },
          Student: {
            select: { id: true, firstName: true, lastName: true, studentId: true },
          },
        },
      });

      // Mark copy as available again
      await tx.bookCopy.update({
        where: { id: borrowRecord.bookCopyId },
        data: { isAvailable: true },
      });

      return updatedRecord;
    });

    return NextResponse.json({
      ...updated,
      fineAmount,
      isOverdue: fineAmount > 0,
      message:
        fineAmount > 0
          ? `Book returned with a fine of $${fineAmount.toFixed(2)}`
          : "Book returned successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("[PATCH /api/library/borrow]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
