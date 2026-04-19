import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExamsClient } from "@/components/examinations/exams-client";
import { EnterResultsClient } from "@/components/examinations/enter-results-client";
import { ReportCardsClient } from "@/components/examinations/report-cards-client";

export default async function ExaminationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const schoolId = session.user.schoolId;
  if (!schoolId) redirect("/login");

  // Get sections with classes for the school
  const sections = await prisma.section.findMany({
    where: {
      Class: { schoolId },
    },
    include: {
      Class: { select: { id: true, name: true, level: true } },
    },
    orderBy: [{ Class: { level: "asc" } }, { name: "asc" }],
  });

  // Transform sections for client
  const transformedSections = sections.map((s) => ({
    id: s.id,
    name: s.name,
    classId: s.classId,
    class: { id: s.Class.id, name: s.Class.name, level: s.Class.level },
  }));

  // Get subjects for the school
  const subjects = await prisma.subject.findMany({
    where: { schoolId },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  // Get academic years
  const academicYears = await prisma.academicYear.findMany({
    where: { schoolId },
    select: { id: true, name: true, isCurrent: true },
    orderBy: { startDate: "desc" },
  });

  // Get terms for current academic year
  const currentAcademicYear = academicYears.find(ay => ay.isCurrent);
  const terms = currentAcademicYear
    ? await prisma.term.findMany({
        where: { academicYearId: currentAcademicYear.id },
        select: { id: true, name: true },
        orderBy: { startDate: "asc" },
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Examination Management</h1>
        <p className="text-muted-foreground">Manage exams, enter results, and generate report cards</p>
      </div>

      <Tabs defaultValue="exams" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="exams">Exams</TabsTrigger>
          <TabsTrigger value="results">Enter Results</TabsTrigger>
          <TabsTrigger value="reports">Report Cards</TabsTrigger>
        </TabsList>

        <TabsContent value="exams">
          <ExamsClient
            academicYears={academicYears}
            terms={terms}
            sections={transformedSections}
            subjects={subjects}
          />
        </TabsContent>

        <TabsContent value="results">
          <EnterResultsClient
            academicYears={academicYears}
            sections={transformedSections}
            subjects={subjects}
          />
        </TabsContent>

        <TabsContent value="reports">
          <ReportCardsClient
            academicYears={academicYears}
            terms={terms}
            sections={transformedSections}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
