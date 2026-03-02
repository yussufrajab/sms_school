"use client";

import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import {
  CalendarIcon,
  CheckCircle,
  XCircle,
  Clock,
  LogOut,
  Users,
  Save,
  Coffee,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type StaffAttendanceStatus = "PRESENT" | "ABSENT" | "ON_LEAVE" | "HALF_DAY";

interface Staff {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  department?: string;
  designation?: string;
  photoUrl?: string;
  onLeave?: boolean;
}

interface StaffAttendanceRecord {
  id: string;
  staffId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: StaffAttendanceStatus;
  remarks?: string;
}

interface StaffAttendanceClientProps {
  departments: string[];
}

const statusConfig: Record<StaffAttendanceStatus, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  PRESENT: { label: "Present", color: "text-green-600", bgColor: "bg-green-100", icon: CheckCircle },
  ABSENT: { label: "Absent", color: "text-red-600", bgColor: "bg-red-100", icon: XCircle },
  ON_LEAVE: { label: "On Leave", color: "text-blue-600", bgColor: "bg-blue-100", icon: Coffee },
  HALF_DAY: { label: "Half Day", color: "text-yellow-600", bgColor: "bg-yellow-100", icon: Clock },
};

export function StaffAttendanceClient({ departments }: StaffAttendanceClientProps) {
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [staff, setStaff] = useState<Staff[]>([]);
  const [attendance, setAttendance] = useState<Record<string, { status: StaffAttendanceStatus; checkIn?: string; checkOut?: string; remarks?: string }>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date: selectedDate.toISOString().split("T")[0],
        ...(selectedDepartment !== "all" && { department: selectedDepartment }),
      });

      const res = await fetch(`/api/attendance/staff?${params}`);
      const data = await res.json();

      if (data.staff) {
        setStaff(data.staff);
        
        // Initialize attendance records
        const initial: Record<string, { status: StaffAttendanceStatus; checkIn?: string; checkOut?: string; remarks?: string }> = {};
        data.staff.forEach((s: Staff) => {
          const record = data.records?.find((r: StaffAttendanceRecord) => r.staffId === s.id);
          initial[s.id] = {
            status: record?.status || (s.onLeave ? "ON_LEAVE" : "PRESENT"),
            checkIn: record?.checkIn ? format(new Date(record.checkIn), "HH:mm") : undefined,
            checkOut: record?.checkOut ? format(new Date(record.checkOut), "HH:mm") : undefined,
            remarks: record?.remarks || undefined,
          };
        });
        setAttendance(initial);
      }
    } catch (error) {
      toast.error("Failed to load staff");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [selectedDate, selectedDepartment]);

  const handleStatusChange = (staffId: string, status: StaffAttendanceStatus) => {
    setAttendance(prev => ({
      ...prev,
      [staffId]: { ...prev[staffId], status },
    }));
  };

  const handleCheckInChange = (staffId: string, time: string) => {
    setAttendance(prev => ({
      ...prev,
      [staffId]: { ...prev[staffId], checkIn: time },
    }));
  };

  const handleCheckOutChange = (staffId: string, time: string) => {
    setAttendance(prev => ({
      ...prev,
      [staffId]: { ...prev[staffId], checkOut: time },
    }));
  };

  const handleRemarksChange = (staffId: string, remarks: string) => {
    setAttendance(prev => ({
      ...prev,
      [staffId]: { ...prev[staffId], remarks },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/attendance/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate.toISOString().split("T")[0],
          records: Object.entries(attendance).map(([staffId, data]) => ({
            staffId,
            status: data.status,
            checkIn: data.checkIn,
            checkOut: data.checkOut,
            remarks: data.remarks,
          })),
        }),
      });

      if (!res.ok) throw new Error("Failed to save attendance");

      toast.success("Staff attendance saved successfully");
      fetchStaff();
    } catch (error) {
      toast.error("Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  const setAllPresent = () => {
    const newAttendance: Record<string, { status: StaffAttendanceStatus; checkIn?: string; checkOut?: string; remarks?: string }> = {};
    const now = format(new Date(), "HH:mm");
    staff.forEach(s => {
      if (!s.onLeave) {
        newAttendance[s.id] = { status: "PRESENT", checkIn: now };
      } else {
        newAttendance[s.id] = attendance[s.id] || { status: "ON_LEAVE" };
      }
    });
    setAttendance(newAttendance);
  };

  const presentCount = Object.values(attendance).filter(a => a.status === "PRESENT").length;
  const absentCount = Object.values(attendance).filter(a => a.status === "ABSENT").length;
  const onLeaveCount = Object.values(attendance).filter(a => a.status === "ON_LEAVE").length;
  const halfDayCount = Object.values(attendance).filter(a => a.status === "HALF_DAY").length;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Mark Staff Attendance</CardTitle>
          <CardDescription>Select department and date to mark staff attendance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Department</label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
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
            <div className="flex items-end">
              <Button variant="outline" onClick={fetchStaff}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {staff.length > 0 && (
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
                  <p className="text-sm text-muted-foreground">On Leave</p>
                  <p className="text-2xl font-bold text-blue-600">{onLeaveCount}</p>
                </div>
                <Coffee className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Half Day</p>
                  <p className="text-2xl font-bold text-yellow-600">{halfDayCount}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Staff List */}
      {staff.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Staff ({staff.length})
                </CardTitle>
                <CardDescription>Mark attendance with check-in/check-out times</CardDescription>
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((member) => {
                    const record = attendance[member.id] || { status: "PRESENT" as StaffAttendanceStatus };
                    const status = record.status;
                    const config = statusConfig[status];
                    const Icon = config.icon;

                    return (
                      <TableRow key={member.id} className={cn(member.onLeave && "bg-blue-50/50")}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              {member.photoUrl ? (
                                <img src={member.photoUrl} alt="" />
                              ) : (
                                <AvatarFallback>
                                  {member.firstName[0]}{member.lastName[0]}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {member.firstName} {member.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">{member.employeeId}</p>
                            </div>
                            {member.onLeave && (
                              <Badge variant="outline" className="text-xs">On Leave</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.department || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-1">
                            {(Object.keys(statusConfig) as StaffAttendanceStatus[]).map((s) => {
                              const cfg = statusConfig[s];
                              const I = cfg.icon;
                              return (
                                <Button
                                  key={s}
                                  variant={status === s ? "default" : "outline"}
                                  size="sm"
                                  className={cn(
                                    "h-8 w-8 p-0",
                                    status === s && cfg.bgColor
                                  )}
                                  onClick={() => handleStatusChange(member.id, s)}
                                  disabled={member.onLeave && s !== "ON_LEAVE"}
                                >
                                  <I className="h-4 w-4" />
                                </Button>
                              );
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="time"
                            className="w-28"
                            value={record.checkIn || ""}
                            onChange={(e) => handleCheckInChange(member.id, e.target.value)}
                            disabled={status === "ABSENT" || status === "ON_LEAVE"}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="time"
                            className="w-28"
                            value={record.checkOut || ""}
                            onChange={(e) => handleCheckOutChange(member.id, e.target.value)}
                            disabled={status === "ABSENT" || status === "ON_LEAVE"}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Add remarks..."
                            value={record.remarks || ""}
                            onChange={(e) => handleRemarksChange(member.id, e.target.value)}
                            className="w-40"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="text-center py-12 text-muted-foreground">
          Loading staff...
        </div>
      )}

      {!loading && staff.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No staff found for the selected criteria
        </div>
      )}
    </div>
  );
}
