"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Printer,
  Calendar,
  Clock,
  BookOpen,
  User,
  MapPin,
  Eye,
} from "lucide-react";

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

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <Icon className="h-4 w-4 mt-0.5 text-gray-500 shrink-0" />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium">{value || "—"}</p>
      </div>
    </div>
  );
}

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
  const [showSaturday, setShowSaturday] = useState(false);
  const [viewEntry, setViewEntry] = useState<TimetableEntry | null>(null);

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

  const fetchTimetable = useCallback(async (sectionId: string) => {
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
  }, []);

  const fetchTeacherTimetable = useCallback(async (staffId: string) => {
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
  }, []);

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

  // Stats
  const uniqueSubjects = new Set(timetable.map((e) => e.subject.id));
  const uniqueTeachers = new Set(timetable.map((e) => e.staff.id));
  const totalSlots = PERIODS.length * (showSaturday ? 6 : 5);
  const coveragePercent = totalSlots > 0 ? Math.round((timetable.length / totalSlots) * 100) : 0;

  const dayRange = showSaturday ? DAYS.slice(1, 7) : DAYS.slice(1, 6);

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

      {/* Stats Cards */}
      {timetable.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-500">Periods</p>
                  <p className="text-xl font-bold">{timetable.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-xs text-gray-500">Subjects</p>
                  <p className="text-xl font-bold">{uniqueSubjects.size}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-xs text-gray-500">Teachers</p>
                  <p className="text-xl font-bold">{uniqueTeachers.size}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <div>
                  <p className="text-xs text-gray-500">Coverage</p>
                  <p className="text-xl font-bold">{coveragePercent}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Timetable Grid */}
      <Card className="print:shadow-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle className="text-lg">Weekly Schedule</CardTitle>
            <div className="flex items-center gap-2 print:hidden">
              <Switch
                id="saturday-toggle"
                checked={showSaturday}
                onCheckedChange={setShowSaturday}
              />
              <Label htmlFor="saturday-toggle" className="text-sm text-gray-600">
                Saturday
              </Label>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handlePrint} className="print:hidden">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20" />
                {dayRange.map((_, i) => (
                  <Skeleton key={i} className="h-8 flex-1" />
                ))}
              </div>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex gap-2">
                  <Skeleton className="h-16 w-20" />
                  {dayRange.map((_, j) => (
                    <Skeleton key={j} className="h-16 flex-1" />
                  ))}
                </div>
              ))}
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
                    {dayRange.map((day) => (
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
                      {dayRange.map((_, dayIndex) => {
                        const dayNum = dayIndex + 1;
                        const entry = getEntry(dayNum, period);
                        return (
                          <td
                            key={dayIndex}
                            className="border border-gray-300 px-2 py-2"
                          >
                            {entry ? (
                              <div
                                className={`rounded-md p-2 text-xs cursor-pointer hover:opacity-80 transition-opacity ${
                                  subjectColorMap.get(entry.subject.id) ||
                                  "bg-gray-100 border-gray-300"
                                }`}
                                onClick={() => setViewEntry(entry)}
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
                                —
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
                const count = timetable.filter((e) => e.subject.id === subjectId).length;
                return (
                  <div
                    key={subjectId}
                    className={`px-3 py-1 rounded-md text-sm flex items-center gap-2 ${color}`}
                  >
                    {entry?.subject.name}
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                      {count}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Entry Dialog */}
      <Dialog open={!!viewEntry} onOpenChange={(open) => !open && setViewEntry(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              Period Details
            </DialogTitle>
          </DialogHeader>
          {viewEntry && (
            <div className="space-y-1">
              <InfoItem
                icon={BookOpen}
                label="Subject"
                value={`${viewEntry.subject.name} (${viewEntry.subject.code})`}
              />
              <InfoItem
                icon={User}
                label="Teacher"
                value={`${viewEntry.staff.firstName} ${viewEntry.staff.lastName}`}
              />
              <InfoItem
                icon={Calendar}
                label="Day"
                value={DAYS[viewEntry.dayOfWeek]}
              />
              <InfoItem
                icon={Clock}
                label="Time"
                value={`Period ${viewEntry.periodNo}: ${viewEntry.startTime} - ${viewEntry.endTime}`}
              />
              <InfoItem
                icon={MapPin}
                label="Classroom"
                value={viewEntry.classroom}
              />
              <InfoItem
                icon={Calendar}
                label="Class"
                value={`${viewEntry.section.class.name} - ${viewEntry.section.name}`}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}