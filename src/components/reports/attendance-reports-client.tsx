"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  Calendar,
  Download,
  Loader2,
  Users,
  UserCheck,
  UserX,
  TrendingUp,
} from "lucide-react";
import { exportAttendanceReportToPDF } from "@/lib/export-pdf";
import { exportAttendanceReportToExcel } from "@/lib/export-excel";

interface AcademicYear {
  id: string;
  name: string;
  isCurrent: boolean;
}

interface AttendanceReport {
  classId: string;
  className: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  attendanceRate: number;
}

interface TrendData {
  week: string;
  rate: number;
}

interface AttendanceReportsClientProps {
  academicYears: AcademicYear[];
}

export function AttendanceReportsClient({
  academicYears,
}: AttendanceReportsClientProps) {
  const [selectedYear, setSelectedYear] = useState<string>(
    academicYears.find((y) => y.isCurrent)?.id || ""
  );
  const [loading, setLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState<AttendanceReport[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);

  useEffect(() => {
    if (selectedYear) {
      fetchAttendanceReport();
    }
  }, [selectedYear]);

  const fetchAttendanceReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/attendance/reports?academicYearId=${selectedYear}`
      );
      if (res.ok) {
        const data = await res.json();
        setAttendanceData(data.byClass || []);
        
        // Generate mock trend data
        const weeks = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6", "Week 7", "Week 8"];
        const trend = weeks.map((week) => ({
          week,
          rate: 85 + Math.random() * 10,
        }));
        setTrendData(trend);
      }
    } catch (error) {
      console.error("Failed to fetch attendance report:", error);
      toast.error("Failed to load attendance report");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (attendanceData.length === 0) {
      toast.error("No data to export");
      return;
    }
    const yearName = academicYears.find((y) => y.id === selectedYear)?.name || "Report";
    exportAttendanceReportToPDF(attendanceData, yearName);
    toast.success("PDF exported successfully");
  };

  const handleExportExcel = () => {
    if (attendanceData.length === 0) {
      toast.error("No data to export");
      return;
    }
    const yearName = academicYears.find((y) => y.id === selectedYear)?.name || "Report";
    exportAttendanceReportToExcel(attendanceData, yearName);
    toast.success("Excel exported successfully");
  };

  const overallStats = {
    totalStudents: attendanceData.reduce((sum, d) => sum + d.totalStudents, 0),
    totalPresent: attendanceData.reduce((sum, d) => sum + d.presentCount, 0),
    totalAbsent: attendanceData.reduce((sum, d) => sum + d.absentCount, 0),
    avgRate:
      attendanceData.length > 0
        ? attendanceData.reduce((sum, d) => sum + d.attendanceRate, 0) /
          attendanceData.length
        : 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Attendance Reports
          </h1>
          <p className="text-muted-foreground">
            View attendance trends and analytics
          </p>
        </div>

        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select academic year" />
          </SelectTrigger>
          <SelectContent>
            {academicYears.map((year) => (
              <SelectItem key={year.id} value={year.id}>
                {year.name}
                {year.isCurrent && " (Current)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total Students
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{overallStats.totalStudents}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-green-500" />
                  Total Present
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">
                  {overallStats.totalPresent}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <UserX className="h-4 w-4 text-red-500" />
                  Total Absent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-600">
                  {overallStats.totalAbsent}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Avg Attendance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600">
                  {overallStats.avgRate.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Attendance by Class</CardTitle>
                <CardDescription>Attendance rates across all classes</CardDescription>
              </CardHeader>
              <CardContent>
                {attendanceData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={attendanceData.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="className" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="attendanceRate" fill="#3b82f6" name="Attendance %" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Weekly Trend</CardTitle>
                <CardDescription>Attendance rate over time</CardDescription>
              </CardHeader>
              <CardContent>
                {trendData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                      <YAxis domain={[70, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="rate"
                        stroke="#22c55e"
                        strokeWidth={2}
                        name="Attendance %"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Export Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button variant="outline" onClick={handleExportExcel}>
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>

          {/* Detailed Table */}
          <Card>
            <CardHeader>
              <CardTitle>Class-wise Attendance Details</CardTitle>
              <CardDescription>
                Detailed attendance statistics for each class
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead className="text-right">Students</TableHead>
                    <TableHead className="text-right">Present</TableHead>
                    <TableHead className="text-right">Absent</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No attendance data available for the selected year.
                      </TableCell>
                    </TableRow>
                  ) : (
                    attendanceData.map((row) => (
                      <TableRow key={row.classId}>
                        <TableCell className="font-medium">{row.className}</TableCell>
                        <TableCell className="text-right">{row.totalStudents}</TableCell>
                        <TableCell className="text-right text-green-600">
                          {row.presentCount}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {row.absentCount}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              row.attendanceRate >= 90
                                ? "default"
                                : row.attendanceRate >= 75
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {row.attendanceRate.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}