"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import {
  CalendarIcon,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Save,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

interface Student {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
}

interface MarkAttendanceClientProps {
  sections: Array<{
    id: string;
    name: string;
    class: { name: string };
  }>;
  initialStudents?: Student[];
}

const statusConfig: Record<AttendanceStatus, { label: string; color: string; icon: React.ElementType }> = {
  PRESENT: { label: "Present", color: "bg-green-500", icon: CheckCircle },
  ABSENT: { label: "Absent", color: "bg-red-500", icon: XCircle },
  LATE: { label: "Late", color: "bg-yellow-500", icon: Clock },
  EXCUSED: { label: "Excused", color: "bg-blue-500", icon: AlertCircle },
};

export function MarkAttendanceClient({ sections, initialStudents = [] }: MarkAttendanceClientProps) {
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSectionChange = async (sectionId: string) => {
    setSelectedSection(sectionId);
    setLoading(true);
    
    try {
      const res = await fetch(`/api/students?sectionId=${sectionId}`);
      const data = await res.json();
      setStudents(data.students || []);
      
      // Initialize attendance with default ABSENT status
      const initial: Record<string, AttendanceStatus> = {};
      data.students?.forEach((s: Student) => {
        initial[s.id] = "ABSENT";
      });
      setAttendance(initial);
    } catch (error) {
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSave = async () => {
    if (!selectedSection) {
      toast.error("Please select a class");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: selectedSection,
          date: selectedDate.toISOString().split("T")[0],
          attendance: Object.entries(attendance).map(([studentId, status]) => ({
            studentId,
            status,
          })),
        }),
      });

      if (!res.ok) throw new Error("Failed to save attendance");
      
      toast.success("Attendance saved successfully");
    } catch (error) {
      toast.error("Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  const setAllPresent = () => {
    const newAttendance: Record<string, AttendanceStatus> = {};
    students.forEach(s => {
      newAttendance[s.id] = "PRESENT";
    });
    setAttendance(newAttendance);
  };

  const presentCount = Object.values(attendance).filter(s => s === "PRESENT").length;
  const absentCount = Object.values(attendance).filter(s => s === "ABSENT").length;
  const lateCount = Object.values(attendance).filter(s => s === "LATE").length;
  const excusedCount = Object.values(attendance).filter(s => s === "EXCUSED").length;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Mark Attendance</CardTitle>
          <CardDescription>Select class and date to mark student attendance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Class & Section</label>
              <Select value={selectedSection} onValueChange={handleSectionChange}>
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
              <label className="text-sm font-medium mb-2 block">Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    disabled={(date) => date > new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {students.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Present</p>
                  <p className="text-2xl font-bold text-green-600">{presentCount}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Absent</p>
                  <p className="text-2xl font-bold text-red-600">{absentCount}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Late</p>
                  <p className="text-2xl font-bold text-yellow-600">{lateCount}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Excused</p>
                  <p className="text-2xl font-bold text-blue-600">{excusedCount}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Student List */}
      {students.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Students ({students.length})
                </CardTitle>
                <CardDescription>Click on status buttons to mark attendance</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={setAllPresent}>
                  Mark All Present
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Attendance"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => {
                  const status = attendance[student.id] || "ABSENT";
                  return (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {student.firstName[0]}{student.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {student.firstName} {student.lastName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {student.studentId}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1">
                          {(Object.keys(statusConfig) as AttendanceStatus[]).map((s) => {
                            const config = statusConfig[s];
                            const Icon = config.icon;
                            return (
                              <Button
                                key={s}
                                variant={status === s ? "default" : "outline"}
                                size="sm"
                                className={cn(
                                  "h-8 w-8 p-0",
                                  status === s && config.color
                                )}
                                onClick={() => handleStatusChange(student.id, s)}
                              >
                                <Icon className="h-4 w-4" />
                              </Button>
                            );
                          })}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="text-center py-12 text-muted-foreground">
          Loading students...
        </div>
      )}

      {!loading && selectedSection && students.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No students found in this class
        </div>
      )}
    </div>
  );
}
