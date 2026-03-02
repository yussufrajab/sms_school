"use client";

import { useState, useEffect } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Download,
  FileText,
  TrendingUp,
  Users,
  Calendar,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface AttendanceReportClientProps {
  sections: Array<{
    id: string;
    name: string;
    class: { name: string };
  }>;
  academicYearId?: string;
}

interface StudentSummary {
  studentId: string;
  studentName: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  percentage: number;
}

interface DailyStat {
  date: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
}

interface ReportData {
  summary: StudentSummary[];
  dailyStats: DailyStat[];
  overall: {
    totalStudents: number;
    totalPresent: number;
    totalAbsent: number;
    totalLate: number;
    totalExcused: number;
    totalRecords: number;
    overallPercentage: number;
  };
}

export function AttendanceReportClient({ sections, academicYearId }: AttendanceReportClientProps) {
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [dateRange, setDateRange] = useState<"week" | "month" | "term">("month");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  // Calculate date range based on selection
  const getDateRange = () => {
    const end = new Date();
    const start = new Date();

    switch (dateRange) {
      case "week":
        start.setDate(start.getDate() - 7);
        break;
      case "month":
        start.setMonth(start.getMonth() - 1);
        break;
      case "term":
        start.setMonth(start.getMonth() - 4);
        break;
    }

    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  };

  // Fetch data when section or date range changes
  useEffect(() => {
    if (!selectedSection) {
      setData(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const { startDate, endDate } = getDateRange();
        const params = new URLSearchParams({
          sectionId: selectedSection,
          startDate,
          endDate,
        });

        if (academicYearId) {
          params.append("academicYearId", academicYearId);
        }

        const res = await fetch(`/api/attendance/reports?${params}`);
        if (!res.ok) throw new Error("Failed to fetch data");

        const result = await res.json();
        setData(result);
      } catch (error) {
        toast.error("Failed to load attendance data");
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedSection, dateRange, academicYearId]);

  const handleExport = async (format: "csv" | "pdf") => {
    if (!selectedSection) {
      toast.error("Please select a class");
      return;
    }
    
    if (!data) {
      toast.error("No data to export");
      return;
    }

    if (format === "csv") {
      // Generate CSV
      const headers = ["Student ID", "Name", "Present", "Absent", "Late", "Excused", "Total", "Percentage"];
      const rows = data.summary.map(s => [
        s.studentId,
        s.studentName,
        s.present,
        s.absent,
        s.late,
        s.excused,
        s.total,
        `${s.percentage}%`
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map(r => r.join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-report-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success("CSV exported successfully");
    } else {
      toast.info("PDF export coming soon");
    }
  };

  const chartData = data?.dailyStats?.map(d => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    present: d.present,
    absent: d.absent,
    late: d.late,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Reports</CardTitle>
          <CardDescription>View and export attendance reports</CardDescription>
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
              <label className="text-sm font-medium mb-2 block">Time Period</label>
              <Select value={dateRange} onValueChange={(v) => setDateRange(v as "week" | "month" | "term")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="term">This Term</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={() => handleExport("csv")} disabled={!data}>
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
              <Button variant="outline" onClick={() => handleExport("pdf")} disabled={!data}>
                <FileText className="mr-2 h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Summary Stats */}
      {!loading && data && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Attendance</p>
                  <p className="text-2xl font-bold">{data.overall.overallPercentage}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-bold">{data.overall.totalStudents}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Days Recorded</p>
                  <p className="text-2xl font-bold">{data.dailyStats.length}</p>
                </div>
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Below 75%</p>
                  <p className="text-2xl font-bold text-red-600">
                    {data.summary.filter(s => s.percentage < 75).length}
                  </p>
                </div>
                <Users className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {!loading && !data && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Select a class to view attendance reports
          </CardContent>
        </Card>
      )}

      {/* Tabs for different views */}
      {!loading && data && (
        <Tabs defaultValue="summary">
          <TabsList>
            <TabsTrigger value="summary">Student Summary</TabsTrigger>
            <TabsTrigger value="daily">Daily Stats</TabsTrigger>
            <TabsTrigger value="chart">Chart View</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Student Attendance Summary</CardTitle>
                <CardDescription>Individual student attendance records</CardDescription>
              </CardHeader>
              <CardContent>
                {data.summary.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead className="text-center">Present</TableHead>
                        <TableHead className="text-center">Absent</TableHead>
                        <TableHead className="text-center">Late</TableHead>
                        <TableHead className="text-center">Excused</TableHead>
                        <TableHead className="text-center">Total Days</TableHead>
                        <TableHead className="text-center">Percentage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.summary.map((student) => (
                        <TableRow key={student.studentId}>
                          <TableCell className="font-medium">{student.studentName}</TableCell>
                          <TableCell className="text-center text-green-600">{student.present}</TableCell>
                          <TableCell className="text-center text-red-600">{student.absent}</TableCell>
                          <TableCell className="text-center text-yellow-600">{student.late}</TableCell>
                          <TableCell className="text-center text-blue-600">{student.excused}</TableCell>
                          <TableCell className="text-center">{student.total}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={student.percentage >= 75 ? "default" : "destructive"}>
                              {student.percentage}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No attendance records found for this period
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="daily" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Daily Attendance Records</CardTitle>
                <CardDescription>Day-by-day attendance breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {data.dailyStats.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-center">Present</TableHead>
                        <TableHead className="text-center">Absent</TableHead>
                        <TableHead className="text-center">Late</TableHead>
                        <TableHead className="text-center">Attendance Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.dailyStats.map((day) => {
                        const total = day.present + day.absent + day.late + day.excused;
                        const rate = total > 0 ? Math.round((day.present / total) * 100) : 0;
                        return (
                          <TableRow key={day.date}>
                            <TableCell className="font-medium">
                              {new Date(day.date).toLocaleDateString("en-US", { 
                                weekday: "short", 
                                month: "short", 
                                day: "numeric" 
                              })}
                            </TableCell>
                            <TableCell className="text-center text-green-600">{day.present}</TableCell>
                            <TableCell className="text-center text-red-600">{day.absent}</TableCell>
                            <TableCell className="text-center text-yellow-600">{day.late}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={rate >= 75 ? "default" : "destructive"}>
                                {rate}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No daily records available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chart" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Trend</CardTitle>
                <CardDescription>Visual representation of attendance over time</CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip />
                        <Bar dataKey="present" fill="#22c55e" name="Present" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="absent" fill="#ef4444" name="Absent" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="late" fill="#f59e0b" name="Late" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No chart data available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
