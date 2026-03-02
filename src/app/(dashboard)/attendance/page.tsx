import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarkAttendanceClient } from "@/components/attendance/mark-attendance-client";
import { AttendanceReportClient } from "@/components/attendance/attendance-report-client";
import { AttendanceCalendarClient } from "@/components/attendance/attendance-calendar-client";
import { StaffAttendanceClient } from "@/components/attendance/staff-attendance-client";

export default async function AttendancePage() {
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
      Class: { select: { name: true } },
    },
    orderBy: { Class: { level: "asc" } },
  });

  // Transform to lowercase for client components
  const transformedSections = sections.map((s) => ({
    id: s.id,
    name: s.name,
    classId: s.classId,
    class: { name: s.Class.name },
  }));

  // Get current academic year
  const academicYear = await prisma.academicYear.findFirst({
    where: {
      schoolId,
      isCurrent: true,
    },
    select: { id: true, name: true },
  });

  // Get unique departments for staff attendance filter
  const departments = await prisma.staff.findMany({
    where: {
      schoolId,
      department: { not: null },
    },
    select: { department: true },
    distinct: ["department"],
  });

  const departmentList = departments
    .map((d) => d.department)
    .filter((d): d is string => d !== null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Attendance Management</h1>
        <p className="text-muted-foreground">Mark, track, and analyze attendance</p>
      </div>

      <Tabs defaultValue="mark" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
          <TabsTrigger value="mark">Students</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="mark">
          <MarkAttendanceClient sections={transformedSections} />
        </TabsContent>

        <TabsContent value="staff">
          <StaffAttendanceClient departments={departmentList} />
        </TabsContent>

        <TabsContent value="reports">
          <AttendanceReportClient 
            sections={transformedSections} 
            academicYearId={academicYear?.id}
          />
        </TabsContent>

        <TabsContent value="calendar">
          <AttendanceCalendarClient 
            sections={transformedSections}
            academicYearId={academicYear?.id}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
