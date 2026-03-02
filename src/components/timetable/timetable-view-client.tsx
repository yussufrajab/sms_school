"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Printer } from "lucide-react";

interface TimetableEntry {
  id: string;
  dayOfWeek: number;
  periodNo: number;
  startTime: string;
  endTime: string;
  classroom: string | null;
  section: {
    id: string;
    name: string;
    class: { id: string; name: string };
  };
  subject: {
    id: string;
    name: string;
    code: string;
  };
  staff: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface ClassWithSections {
  id: string;
  name: string;
  level: number;
  sections: { id: string; name: string }[];
}

interface TimetableViewClientProps {
  classes: ClassWithSections[];
  studentSection: { id: string; name: string; class: { id: string; name: string } } | null;
  teacherStaffId: string | null;
  userRole: string;
}

const DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

// Color palette for subjects
const SUBJECT_COLORS = [
  "bg-blue-100 border-blue-300 text-blue-800",
  "bg-green-100 border-green-300 text-green-800",
  "bg-purple-100 border-purple-300 text-purple-800",
  "bg-orange-100 border-orange-300 text-orange-800",
  "bg-pink-100 border-pink-300 text-pink-800",
  "bg-teal-100 border-teal-300 text-teal-800",
  "bg-indigo-100 border-indigo-300 text-indigo-800",
  "bg-yellow-100 border-yellow-300 text-yellow-800",
  "bg-red-100 border-red-300 text-red-800",
  "bg-cyan-100 border-cyan-300 text-cyan-800",
];

export default function TimetableViewClient({
  classes,
  studentSection,
  teacherStaffId,
  userRole,
}: TimetableViewClientProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [subjectColorMap, setSubjectColorMap] = useState<Map<string, string>>(new Map());

  // Auto-select student's section
  useEffect(() => {
    if (studentSection) {
      setSelectedSectionId(studentSection.id);
    }
  }, [studentSection]);

  // Fetch timetable when section changes
  useEffect(() => {
    if (selectedSectionId) {
      fetchTimetable(selectedSectionId);
    } else if (teacherStaffId && userRole === "TEACHER") {
      fetchTeacherTimetable(teacherStaffId);
    }
  }, [selectedSectionId, teacherStaffId, userRole]);

  const fetchTimetable = async (sectionId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/timetable?sectionId=${sectionId}`);
      if (res.ok) {
        const data = await res.json();
        setTimetable(data);
        assignColors(data);
      }
    } catch (error) {
      console.error("Failed to fetch timetable:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherTimetable = async (staffId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/timetable?staffId=${staffId}`);
      if (res.ok) {
        const data = await res.json();
        setTimetable(data);
        assignColors(data);
      }
    } catch (error) {
      console.error("Failed to fetch timetable:", error);
    } finally {
      setLoading(false);
    }
  };

  const assignColors = (entries: TimetableEntry[]) => {
    const colorMap = new Map<string, string>();
    const subjects = [...new Set(entries.map((e) => e.subject.id))];
    subjects.forEach((subjectId, index) => {
      colorMap.set(subjectId, SUBJECT_COLORS[index % SUBJECT_COLORS.length]);
    });
    setSubjectColorMap(colorMap);
  };

  const getEntry = (day: number, period: number): TimetableEntry | undefined => {
    return timetable.find((e) => e.dayOfWeek === day && e.periodNo === period);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Section Selection */}
      {(userRole === "SUPER_ADMIN" || userRole === "SCHOOL_ADMIN" || userRole === "PARENT") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Section</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Class & Section
                </label>
                <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a section" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) =>
                      cls.sections.map((section) => (
                        <SelectItem key={section.id} value={section.id}>
                          {cls.name} - {section.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Student's Section Info */}
      {studentSection && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-4">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Your Class:</span>{" "}
              {studentSection.class.name} - {studentSection.name}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Timetable Grid */}
      <Card className="print:shadow-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Weekly Schedule</CardTitle>
          <Button variant="outline" size="sm" onClick={handlePrint} className="print:hidden">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : !selectedSectionId && !teacherStaffId ? (
            <div className="text-center py-12 text-gray-500">
              {userRole === "TEACHER"
                ? "No teaching assignments found"
                : "Select a section to view timetable"}
            </div>
          ) : timetable.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No timetable entries found.{" "}
              {(userRole === "SUPER_ADMIN" || userRole === "SCHOOL_ADMIN") &&
                "Create a timetable to get started."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border border-gray-300 bg-gray-100 px-3 py-2 text-left text-sm font-medium">
                      Period
                    </th>
                    {DAYS.slice(1, 6).map((day) => (
                      <th
                        key={day}
                        className="border border-gray-300 bg-gray-100 px-3 py-2 text-center text-sm font-medium min-w-[150px]"
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERIODS.map((period) => (
                    <tr key={period}>
                      <td className="border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium">
                        Period {period}
                      </td>
                      {DAYS.slice(1, 6).map((_, dayIndex) => {
                        const entry = getEntry(dayIndex + 1, period);
                        return (
                          <td
                            key={dayIndex}
                            className="border border-gray-300 px-2 py-2"
                          >
                            {entry ? (
                              <div
                                className={`rounded-md p-2 text-xs ${
                                  subjectColorMap.get(entry.subject.id) ||
                                  "bg-gray-100 border-gray-300"
                                }`}
                              >
                                <div className="font-semibold">{entry.subject.name}</div>
                                <div className="mt-1 opacity-80">
                                  {entry.staff.firstName} {entry.staff.lastName}
                                </div>
                                {entry.classroom && (
                                  <div className="mt-1 opacity-70">
                                    Room: {entry.classroom}
                                  </div>
                                )}
                                <div className="mt-1 opacity-60">
                                  {entry.startTime} - {entry.endTime}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center text-gray-400 text-xs py-4">
                                -
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      {timetable.length > 0 && (
        <Card className="print:page-break-inside-avoid">
          <CardHeader>
            <CardTitle className="text-sm">Subject Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Array.from(subjectColorMap.entries()).map(([subjectId, color]) => {
                const entry = timetable.find((e) => e.subject.id === subjectId);
                return (
                  <div
                    key={subjectId}
                    className={`px-3 py-1 rounded-md text-sm ${color}`}
                  >
                    {entry?.subject.name}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
