import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeeStructuresClient } from "@/components/fees/fee-structures-client";
import { InvoicesClient } from "@/components/fees/invoices-client";
import { PaymentsClient } from "@/components/fees/payments-client";
import { FeeReportsClient } from "@/components/fees/fee-reports-client";

export default async function FeesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const schoolId = session.user.schoolId;
  if (!schoolId) redirect("/login");

  // Get classes for the school
  const classes = await prisma.class.findMany({
    where: { schoolId },
    select: { id: true, name: true, level: true },
    orderBy: { level: "asc" },
  });

  // Get sections with classes
  const sections = await prisma.section.findMany({
    where: {
      Class: { schoolId },
    },
    include: {
      Class: { select: { id: true, name: true, level: true } },
    },
    orderBy: [{ Class: { level: "asc" } }, { name: "asc" }],
  });

  // Transform sections for client components
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fee Management</h1>
        <p className="text-muted-foreground">Manage fee structures, invoices, payments, and reports</p>
      </div>

      <Tabs defaultValue="structures" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
          <TabsTrigger value="structures">Fee Structures</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="structures">
          <FeeStructuresClient
            classes={classes}
            academicYears={academicYears}
            feeCategories={feeCategories}
          />
        </TabsContent>

        <TabsContent value="invoices">
          <InvoicesClient
            sections={transformedSections}
            academicYears={academicYears}
            feeCategories={feeCategories}
          />
        </TabsContent>

        <TabsContent value="payments">
          <PaymentsClient
            academicYears={academicYears}
          />
        </TabsContent>

        <TabsContent value="reports">
          <FeeReportsClient
            academicYears={academicYears}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
