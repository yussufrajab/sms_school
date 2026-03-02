import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";

const createBookSchema = z.object({
  isbn: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  authors: z.string().min(1, "Author(s) are required"),
  publisher: z.string().optional(),
  publishYear: z.number().int().min(1000).max(new Date().getFullYear() + 1).optional(),
  edition: z.string().optional(),
  category: z.string().optional(),
  shelfLocation: z.string().optional(),
  coverUrl: z.string().url().optional().or(z.literal("")),
  digitalUrl: z.string().url().optional().or(z.literal("")),
  totalCopies: z.number().int().min(1).default(1),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "";
  const available = searchParams.get("available"); // "true" | "false" | null

  const schoolId = session.user.schoolId;

  // Build where clause
  const where: Record<string, unknown> = {
    ...(schoolId ? { schoolId } : {}),
    ...(category ? { category: { equals: category, mode: "insensitive" } } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { authors: { contains: search, mode: "insensitive" } },
            { isbn: { contains: search, mode: "insensitive" } },
            { category: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  // Filter by availability: books that have at least one available copy
  if (available === "true") {
    where.BookCopy = { some: { isAvailable: true } };
  } else if (available === "false") {
    where.BookCopy = { none: { isAvailable: true } };
  }

  try {
    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          BookCopy: {
            select: {
              id: true,
              copyNumber: true,
              isAvailable: true,
              condition: true,
            },
          },
          _count: {
            select: { BookCopy: true },
          },
        },
      }),
      prisma.book.count({ where }),
    ]);

    // Compute available copies count per book
    const booksWithAvailability = books.map((book) => ({
      ...book,
      availableCopies: book.BookCopy.filter((c: { isAvailable: boolean }) => c.isAvailable).length,
    }));

    return NextResponse.json({
      data: booksWithAvailability,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/library/books]", error);
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

  const schoolId = session.user.schoolId;
  if (!schoolId) {
    return NextResponse.json({ error: "No school associated with this account" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const data = createBookSchema.parse(body);

    // Check for duplicate ISBN within the school (if ISBN provided)
    if (data.isbn) {
      const existing = await prisma.book.findFirst({
        where: { schoolId, isbn: data.isbn },
      });
      if (existing) {
        return NextResponse.json(
          { error: `A book with ISBN "${data.isbn}" already exists in this school` },
          { status: 409 }
        );
      }
    }

    const book = await prisma.$transaction(async (tx) => {
      // Create the book record
      const newBook = await tx.book.create({
        data: {
          id: randomUUID(),
          schoolId,
          isbn: data.isbn,
          title: data.title,
          authors: data.authors,
          publisher: data.publisher,
          publishYear: data.publishYear,
          edition: data.edition,
          category: data.category,
          shelfLocation: data.shelfLocation,
          coverUrl: data.coverUrl || null,
          digitalUrl: data.digitalUrl || null,
          totalCopies: data.totalCopies,
          updatedAt: new Date(),
        },
      });

      // Create one BookCopy record per totalCopies
      const copyData = Array.from({ length: data.totalCopies }, (_, i) => ({
        id: randomUUID(),
        bookId: newBook.id,
        copyNumber: `${newBook.id.slice(-6).toUpperCase()}-${String(i + 1).padStart(3, "0")}`,
        isAvailable: true,
        condition: "GOOD",
        updatedAt: new Date(),
      }));

      await tx.bookCopy.createMany({ data: copyData });

      // Return book with copies
      return tx.book.findUnique({
        where: { id: newBook.id },
        include: {
          BookCopy: true,
          _count: { select: { BookCopy: true } },
        },
      });
    });

    return NextResponse.json(book, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("[POST /api/library/books]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
