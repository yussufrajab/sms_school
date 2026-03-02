import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BorrowClient } from "@/components/library/borrow-client";

export const metadata = {
  title: "Borrow & Return | Library | School Management System",
  description: "Issue and return library books",
};

const ALLOWED_ROLES = [
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "LIBRARIAN",
] as const;

export default async function LibraryBorrowPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!ALLOWED_ROLES.includes(session.user.role as (typeof ALLOWED_ROLES)[number])) {
    redirect("/dashboard");
  }

  const schoolId = session.user.schoolId;

  // Fetch books with available copies
  const books = await prisma.book.findMany({
    where: schoolId ? { schoolId } : {},
    include: {
      BookCopy: {
        select: { id: true, copyNumber: true, isAvailable: true, condition: true },
      },
    },
    orderBy: { title: "asc" },
  });

  const booksWithAvailability = books.map((book) => ({
    ...book,
    createdAt: book.createdAt.toISOString(),
    updatedAt: book.updatedAt.toISOString(),
    copies: book.BookCopy.filter((c) => c.isAvailable),
  }));

  // Fetch distinct categories
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
    .map((r) => r.category)
    .filter((c): c is string => Boolean(c));

  const canManage = true; // All allowed roles can manage

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Borrow & Return</h1>
        <p className="text-muted-foreground">
          Issue books to students and process returns
        </p>
      </div>

      <BorrowClient
        initialBooks={booksWithAvailability}
        categories={categories}
        canManage={canManage}
      />
    </div>
  );
}
