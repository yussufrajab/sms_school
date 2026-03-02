import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InvoicesClient } from "@/components/fees/invoices-client";

export const metadata = {
  title: "Invoices | Finance | School Management System",
  description: "Manage student fee invoices",
};

export default async function FinanceInvoicesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const allowedRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT", "PARENT", "STUDENT"];
  if (!allowedRoles.includes(session.user.role)) redirect("/dashboard");

  const schoolId = session.user.schoolId;
  if (!schoolId) redirect("/login");

  // Get sections with classes for filtering
  const sections = await prisma.section.findMany({
    where: {
      Class: { schoolId },
    },
    include: {
      Class: { select: { id: true, name: true, level: true } },
    },
    orderBy: [{ Class: { level: "asc" } }, { name: "asc" }],
  });

  const transformedSections = sections.map((s) => ({
    id: s.id,
    name: s.name,
    classId: s.classId,
    class: { id: s.Class.id, name: s.Class.name, level: s.Class.level },
  }));

  // Get academic years
  const academicYears = await prisma.academicYear.findMany({
    where: { schoolId },
    select: { id: true, name: true, isCurrent: true },
    orderBy: { startDate: "desc" },
  });

  // Get fee categories
  const feeCategories = await prisma.feeCategory.findMany({
    where: { schoolId },
    select: { id: true, name: true, description: true, isRecurring: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Invoices</h1>
        <p className="text-muted-foreground">
          Create and manage student fee invoices
        </p>
      </div>

      <InvoicesClient
        sections={transformedSections}
        academicYears={academicYears}
        feeCategories={feeCategories}
      />
    </div>
  );
}
