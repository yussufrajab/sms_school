"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AttendanceCalendarClientProps {
  sections: Array<{
    id: string;
    name: string;
    class: { name: string };
  }>;
  academicYearId?: string;
}

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

interface Student {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
}

interface AttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
}

interface DayAttendance {
  date: Date;
  records: AttendanceRecord[];
  stats: {
    present: number;
    absent: number;
    late: number;
    excused: number;
  };
}

const statusConfig: Record<AttendanceStatus, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  PRESENT: { label: "Present", color: "text-green-600", bgColor: "bg-green-500", icon: CheckCircle },
  ABSENT: { label: "Absent", color: "text-red-600", bgColor: "bg-red-500", icon: XCircle },
  LATE: { label: "Late", color: "text-yellow-600", bgColor: "bg-yellow-500", icon: Clock },
  EXCUSED: { label: "Excused", color: "text-blue-600", bgColor: "bg-blue-500", icon: AlertCircle },
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function AttendanceCalendarClient({ sections, academicYearId }: AttendanceCalendarClientProps) {
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<string>("all");
  const [students, setStudents] = useState<Student[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState<Map<string, AttendanceRecord[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayAttendance | null>(null);

  // Fetch students when section changes
  useEffect(() => {
    if (!selectedSection) {
      setStudents([]);
      return;
    }

    const fetchStudents = async () => {
      try {
        const res = await fetch(`/api/students?sectionId=${selectedSection}&limit=100`);
        const data = await res.json();
        setStudents(data.data || []);
      } catch (error) {
        toast.error("Failed to load students");
        setStudents([]);
      }
    };

    fetchStudents();
  }, [selectedSection]);

  // Fetch attendance data for the month
  useEffect(() => {
    if (!selectedSection) {
      setAttendanceData(new Map());
      return;
    }

    const fetchAttendance = async () => {
      setLoading(true);
      try {
        const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

        const params = new URLSearchParams({
          sectionId: selectedSection,
          startDate: startOfMonth.toISOString().split("T")[0],
          endDate: endOfMonth.toISOString().split("T")[0],
        });

        if (academicYearId) {
          params.append("academicYearId", academicYearId);
        }

        const res = await fetch(`/api/attendance?${params}`);
        if (!res.ok) throw new Error("Failed to fetch attendance");

        const result = await res.json();
        
        // Group by date
        const grouped = new Map<string, AttendanceRecord[]>();
        result.data?.forEach((record: { studentId: string; status: AttendanceStatus; date: string }) => {
          const dateKey = new Date(record.date).toISOString().split("T")[0];
          const existing = grouped.get(dateKey) || [];
          existing.push({ studentId: record.studentId, status: record.status });
          grouped.set(dateKey, existing);
        });

        setAttendanceData(grouped);
      } catch (error) {
        toast.error("Failed to load attendance data");
        setAttendanceData(new Map());
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [selectedSection, currentMonth, academicYearId]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days: (Date | null)[] = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  }, [currentMonth]);

  // Get attendance status for a day
  const getDayStatus = (date: Date): DayAttendance | null => {
    const dateKey = date.toISOString().split("T")[0];
    const records = attendanceData.get(dateKey) || [];
    
    // Filter by selected student if not "all"
    const filteredRecords = selectedStudent === "all" 
      ? records 
      : records.filter(r => r.studentId === selectedStudent);

    if (filteredRecords.length === 0) return null;

    const stats = {
      present: filteredRecords.filter(r => r.status === "PRESENT").length,
      absent: filteredRecords.filter(r => r.status === "ABSENT").length,
      late: filteredRecords.filter(r => r.status === "LATE").length,
      excused: filteredRecords.filter(r => r.status === "EXCUSED").length,
    };

    return { date, records: filteredRecords, stats };
  };

  // Get color for a day based on attendance
  const getDayColor = (dayStatus: DayAttendance | null): string => {
    if (!dayStatus) return "";
    
    const { present, absent, late, excused } = dayStatus.stats;
    const total = present + absent + late + excused;
    
    if (total === 0) return "";
    
    // Determine dominant status
    if (present / total >= 0.75) return "bg-green-100 border-green-300 text-green-800";
    if (absent / total >= 0.5) return "bg-red-100 border-red-300 text-red-800";
    if (late / total >= 0.3) return "bg-yellow-100 border-yellow-300 text-yellow-800";
    if (excused / total >= 0.3) return "bg-blue-100 border-blue-300 text-blue-800";
    
    return "bg-gray-100 border-gray-300 text-gray-800";
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === "prev") {
        newMonth.setMonth(newMonth.getMonth() - 1);
      } else {
        newMonth.setMonth(newMonth.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const handleDayClick = (dayStatus: DayAttendance | null) => {
    if (dayStatus) {
      setSelectedDay(dayStatus);
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isWeekend = (date: Date) => {
    return date.getDay() === 0 || date.getDay() === 6;
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Calendar</CardTitle>
          <CardDescription>View attendance in a monthly calendar format</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Class & Section</label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map(section => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.class.name} - {section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Student</label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  {students.map(student => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.firstName} {student.lastName} ({student.studentId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      {selectedSection && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => navigateMonth("prev")}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => setCurrentMonth(new Date())}>
                  Today
                </Button>
                <Button variant="outline" size="icon" onClick={() => navigateMonth("next")}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Legend */}
                <div className="flex flex-wrap gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-100 border border-green-300" />
                    <span className="text-sm">High Attendance (≥75%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-100 border border-red-300" />
                    <span className="text-sm">Low Attendance (≥50% Absent)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-300" />
                    <span className="text-sm">Many Late</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-blue-100 border border-blue-300" />
                    <span className="text-sm">Many Excused</span>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Day headers */}
                  {DAYS.map(day => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                      {day}
                    </div>
                  ))}
                  
                  {/* Calendar days */}
                  {calendarDays.map((date, index) => {
                    if (!date) {
                      return <div key={`empty-${index}`} className="p-2 min-h-[80px]" />;
                    }

                    const dayStatus = getDayStatus(date);
                    const colorClass = getDayColor(dayStatus);
                    const weekendClass = isWeekend(date) ? "bg-muted/50" : "";
                    const todayClass = isToday(date) ? "ring-2 ring-primary" : "";

                    return (
                      <button
                        key={date.toISOString()}
                        className={cn(
                          "p-2 min-h-[80px] text-left border rounded-md transition-colors",
                          colorClass || weekendClass,
                          todayClass,
                          dayStatus ? "cursor-pointer hover:opacity-80" : "cursor-default"
                        )}
                        onClick={() => handleDayClick(dayStatus)}
                        disabled={!dayStatus}
                      >
                        <div className="text-sm font-medium">{date.getDate()}</div>
                        {dayStatus && (
                          <div className="mt-1 text-xs">
                            <div className="flex gap-1">
                              {dayStatus.stats.present > 0 && (
                                <span className="text-green-600">{dayStatus.stats.present}P</span>
                              )}
                              {dayStatus.stats.absent > 0 && (
                                <span className="text-red-600">{dayStatus.stats.absent}A</span>
                              )}
                              {dayStatus.stats.late > 0 && (
                                <span className="text-yellow-600">{dayStatus.stats.late}L</span>
                              )}
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!selectedSection && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Select a class to view the attendance calendar
          </CardContent>
        </Card>
      )}

      {/* Day Detail Dialog */}
      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Attendance Details - {selectedDay?.date.toLocaleDateString("en-US", { 
                weekday: "long", 
                year: "numeric", 
                month: "long", 
                day: "numeric" 
              })}
            </DialogTitle>
            <DialogDescription>
              {selectedDay?.stats.present} Present, {selectedDay?.stats.absent} Absent, {selectedDay?.stats.late} Late, {selectedDay?.stats.excused} Excused
            </DialogDescription>
          </DialogHeader>
          
          {selectedDay && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedDay.records.map((record) => {
                  const student = students.find(s => s.id === record.studentId);
                  const config = statusConfig[record.status];
                  const Icon = config.icon;
                  
                  return (
                    <TableRow key={record.studentId}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {student?.firstName?.[0]}{student?.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {student?.firstName} {student?.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {student?.studentId}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("gap-1", config.color)}>
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
