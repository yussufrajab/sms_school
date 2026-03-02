import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LibraryBooksClient } from "@/components/library/library-books-client";

export const metadata = { title: "Library — Books" };

const ALLOWED_ROLES = [
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "LIBRARIAN",
  "TEACHER",
  "STUDENT",
] as const;

const MANAGE_ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN", "LIBRARIAN"] as const;

export default async function LibraryBooksPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!ALLOWED_ROLES.includes(session.user.role as (typeof ALLOWED_ROLES)[number])) {
    redirect("/dashboard");
  }

  const schoolId = session.user.schoolId;

  // Fetch distinct categories for the filter dropdown
  const categoryRows = await prisma.book.findMany({
    where: {
      ...(schoolId ? { schoolId } : {}),
      category: { not: null },
    },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });

  const categories = categoryRows
    .map((r: { category: string | null }) => r.category)
    .filter((c: string | null): c is string => Boolean(c));

  // Fetch initial page of books (SSR seed — client will re-fetch on filter changes)
  const initialBooks = await prisma.book.findMany({
    where: schoolId ? { schoolId } : {},
    take: 20,
    orderBy: { createdAt: "desc" },
    include: {
      BookCopy: {
        select: { id: true, copyNumber: true, isAvailable: true, condition: true },
      },
      _count: { select: { BookCopy: true } },
    },
  });

  const booksWithAvailability = initialBooks.map((book) => ({
    ...book,
    createdAt: book.createdAt.toISOString(),
    updatedAt: book.updatedAt.toISOString(),
    copies: book.BookCopy.filter((c) => c.isAvailable),
    availableCopies: book.BookCopy.filter((c) => c.isAvailable).length,
  }));

  const totalBooks = await prisma.book.count({
    where: schoolId ? { schoolId } : {},
  });

  const canManage = MANAGE_ROLES.includes(
    session.user.role as (typeof MANAGE_ROLES)[number]
  );

  return (
    <LibraryBooksClient
      initialBooks={booksWithAvailability}
      initialTotal={totalBooks}
      categories={categories}
      userRole={session.user.role}
      canManage={canManage}
    />
  );
}
