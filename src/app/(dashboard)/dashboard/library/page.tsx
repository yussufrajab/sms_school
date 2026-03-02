import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LibrarianDashboard } from "@/components/dashboard/librarian-dashboard";

export default async function LibrarianDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const schoolId = session.user.schoolId;
  if (!schoolId) redirect("/login");

  // Get book stats
  const books = await prisma.book.findMany({
    where: { schoolId },
    include: {
      BookCopy: true,
    },
  });

  const totalBooks = books.length;
  const totalCopies = books.reduce((sum, b) => sum + b.totalCopies, 0);

  // Get borrowed copies count
  const borrowedCopies = await prisma.bookCopy.count({
    where: { Book: { schoolId }, isAvailable: false },
  });

  // Get overdue books
  const overdueRecords = await prisma.borrowRecord.findMany({
    where: {
      returnDate: null,
      expectedReturn: { lt: new Date() },
    },
    include: {
      BookCopy: { include: { Book: true } },
      Student: true,
    },
    take: 10,
  });

  // Get recent borrows
  const recentBorrows = await prisma.borrowRecord.findMany({
    where: {
      Student: { schoolId },
    },
    include: {
      BookCopy: { include: { Book: true } },
      Student: true,
    },
    orderBy: { borrowDate: "desc" },
    take: 10,
  });

  // Get popular books (most borrowed)
  const popularBooks = await prisma.borrowRecord.groupBy({
    by: ["bookCopyId"],
    where: { Student: { schoolId } },
    _count: true,
  });

  // Get fine summary
  const fines = await prisma.borrowRecord.aggregate({
    where: { Student: { schoolId } },
    _sum: { fineAmount: true },
  });

  const paidFines = await prisma.borrowRecord.aggregate({
    where: { Student: { schoolId }, finePaid: true },
    _sum: { fineAmount: true },
  });

  // Get total members (students + staff)
  const totalMembers = await prisma.student.count({
    where: { schoolId, status: "ACTIVE" },
  }) + await prisma.staff.count({
    where: { schoolId, isActive: true },
  });

  const dashboardData = {
    stats: {
      totalBooks,
      totalCopies,
      availableCopies: totalCopies - borrowedCopies,
      borrowedCopies,
      totalMembers,
    },
    overdueBooks: overdueRecords.map(r => {
      const daysOverdue = Math.floor((new Date().getTime() - r.expectedReturn.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: r.id,
        bookTitle: r.BookCopy.Book.title,
        borrower: r.Student.firstName + " " + r.Student.lastName,
        borrowDate: r.borrowDate.toLocaleDateString(),
        dueDate: r.expectedReturn.toLocaleDateString(),
        daysOverdue,
        fine: r.fineAmount,
      };
    }),
    recentBorrows: recentBorrows.map(r => ({
      id: r.id,
      bookTitle: r.BookCopy.Book.title,
      borrower: r.Student.firstName + " " + r.Student.lastName,
      borrowDate: r.borrowDate.toLocaleDateString(),
      dueDate: r.expectedReturn.toLocaleDateString(),
      status: r.returnDate ? "returned" : "active",
    })),
    popularBooks: [], // Would need more complex query
    fines: {
      totalOutstanding: (fines._sum.fineAmount || 0) - (paidFines._sum.fineAmount || 0),
      collectedThisMonth: paidFines._sum.fineAmount || 0,
    },
  };

  return <LibrarianDashboard user={session.user} data={dashboardData} />;
}
