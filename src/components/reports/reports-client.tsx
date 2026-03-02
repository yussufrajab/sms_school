"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  FileText,
  Download,
  Loader2,
} from "lucide-react";

interface AcademicYear {
  id: string;
  name: string;
  isCurrent: boolean;
}

interface ClassWithSection {
  id: string;
  name: string;
  level: number;
  sections: Array<{ id: string; name: string }>;
}

interface ReportsClientProps {
  academicYears: AcademicYear[];
  classes: ClassWithSection[];
}

interface AcademicReport {
  classId: string;
  className: string;
  totalStudents: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
}

interface FinancialReport {
  totalInvoiced: number;
  totalCollected: number;
  totalOutstanding: number;
  collectionRate: number;
  overdueAmount: number;
}

interface AttendanceReport {
  classId: string;
  className: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  attendanceRate: number;
}

interface StaffReport {
  department: string;
  totalStaff: number;
  onLeave: number;
  active: number;
}

export function ReportsClient({ academicYears, classes }: ReportsClientProps) {
  const [selectedYear, setSelectedYear] = useState<string>(
    academicYears.find((y) => y.isCurrent)?.id || ""
  );
  const [loading, setLoading] = useState(false);
  
  // Report data
  const [academicData, setAcademicData] = useState<AcademicReport[]>([]);
  const [financialData, setFinancialData] = useState<FinancialReport | null>(null);
  const [attendanceData, setAttendanceData] = useState<AttendanceReport[]>([]);
  const [staffData, setStaffData] = useState<StaffReport[]>([]);

  useEffect(() => {
    if (selectedYear) {
      fetchAllReports();
    }
  }, [selectedYear]);

  const fetchAllReports = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAcademicReport(),
        fetchFinancialReport(),
        fetchAttendanceReport(),
        fetchStaffReport(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAcademicReport = async () => {
    try {
      const res = await fetch(`/api/finance/reports?type=academic&academicYearId=${selectedYear}`);
      if (res.ok) {
        const data = await res.json();
        setAcademicData(data.academic || []);
      }
    } catch (error) {
      console.error("Failed to fetch academic report:", error);
    }
  };

  const fetchFinancialReport = async () => {
    try {
      const res = await fetch(`/api/finance/reports?type=financial&academicYearId=${selectedYear}`);
      if (res.ok) {
        const data = await res.json();
        setFinancialData(data.financial || null);
      }
    } catch (error) {
      console.error("Failed to fetch financial report:", error);
    }
  };

  const fetchAttendanceReport = async () => {
    try {
      const res = await fetch(`/api/attendance/reports?academicYearId=${selectedYear}`);
      if (res.ok) {
        const data = await res.json();
        setAttendanceData(data.byClass || []);
      }
    } catch (error) {
      console.error("Failed to fetch attendance report:", error);
    }
  };

  const fetchStaffReport = async () => {
    try {
      const res = await fetch(`/api/hr/leave?report=true`);
      if (res.ok) {
        const data = await res.json();
        // Transform staff data for report
        const departments: Record<string, StaffReport> = {};
        (data.staff || []).forEach((s: { department?: string | null; status: string }) => {
          const dept = s.department || "Unassigned";
          if (!departments[dept]) {
            departments[dept] = { department: dept, totalStaff: 0, onLeave: 0, active: 0 };
          }
          departments[dept].totalStaff++;
          if (s.status === "ON_LEAVE") {
            departments[dept].onLeave++;
          } else {
            departments[dept].active++;
          }
        });
        setStaffData(Object.values(departments));
      }
    } catch (error) {
      console.error("Failed to fetch staff report:", error);
    }
  };

  const handleExport = (type: string) => {
    toast.success(`Exporting ${type} report...`);
    // In a real implementation, this would trigger a download
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select academic year" />
          </SelectTrigger>
          <SelectContent>
            {academicYears.map((year) => (
              <SelectItem key={year.id} value={year.id}>
                {year.name}
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
        <Tabs defaultValue="academic" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="academic">
              <BarChart3 className="h-4 w-4 mr-2" />
              Academic
            </TabsTrigger>
            <TabsTrigger value="financial">
              <DollarSign className="h-4 w-4 mr-2" />
              Financial
            </TabsTrigger>
            <TabsTrigger value="attendance">
              <Calendar className="h-4 w-4 mr-2" />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="staff">
              <Users className="h-4 w-4 mr-2" />
              Staff
            </TabsTrigger>
          </TabsList>

          {/* Academic Reports */}
          <TabsContent value="academic" className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => handleExport("academic")}>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Academic Performance Summary</CardTitle>
                <CardDescription>
                  Class-wise academic performance for the selected academic year
                </CardDescription>
              </CardHeader>
              <CardContent>
                {academicData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No academic data available for the selected year.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Class</TableHead>
                        <TableHead className="text-right">Students</TableHead>
                        <TableHead className="text-right">Avg Score</TableHead>
                        <TableHead className="text-right">Highest</TableHead>
                        <TableHead className="text-right">Lowest</TableHead>
                        <TableHead className="text-right">Pass Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {academicData.map((row) => (
                        <TableRow key={row.classId}>
                          <TableCell className="font-medium">{row.className}</TableCell>
                          <TableCell className="text-right">{row.totalStudents}</TableCell>
                          <TableCell className="text-right">{row.averageScore.toFixed(1)}%</TableCell>
                          <TableCell className="text-right text-green-600">{row.highestScore.toFixed(1)}%</TableCell>
                          <TableCell className="text-right text-red-600">{row.lowestScore.toFixed(1)}%</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={row.passRate >= 80 ? "default" : row.passRate >= 60 ? "secondary" : "destructive"}>
                              {row.passRate.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Reports */}
          <TabsContent value="financial" className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => handleExport("financial")}>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Invoiced
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${financialData?.totalInvoiced.toLocaleString() || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Collected
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ${financialData?.totalCollected.toLocaleString() || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Outstanding Balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    ${financialData?.totalOutstanding.toLocaleString() || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Collection Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {financialData?.collectionRate.toFixed(1) || 0}%
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Fee Collection Summary</CardTitle>
                <CardDescription>
                  Financial overview for the selected academic year
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!financialData ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No financial data available for the selected year.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="text-sm text-green-600">Collected</div>
                        <div className="text-xl font-bold text-green-700">
                          ${financialData.totalCollected.toLocaleString()}
                        </div>
                      </div>
                      <div className="p-4 bg-red-50 rounded-lg">
                        <div className="text-sm text-red-600">Overdue</div>
                        <div className="text-xl font-bold text-red-700">
                          ${financialData.overdueAmount.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendance Reports */}
          <TabsContent value="attendance" className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => handleExport("attendance")}>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Attendance Summary by Class</CardTitle>
                <CardDescription>
                  Overall attendance rates for the selected academic year
                </CardDescription>
              </CardHeader>
              <CardContent>
                {attendanceData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No attendance data available for the selected year.
                  </div>
                ) : (
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
                      {attendanceData.map((row) => (
                        <TableRow key={row.classId}>
                          <TableCell className="font-medium">{row.className}</TableCell>
                          <TableCell className="text-right">{row.totalStudents}</TableCell>
                          <TableCell className="text-right text-green-600">{row.presentCount}</TableCell>
                          <TableCell className="text-right text-red-600">{row.absentCount}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={row.attendanceRate >= 90 ? "default" : row.attendanceRate >= 75 ? "secondary" : "destructive"}>
                              {row.attendanceRate.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staff Reports */}
          <TabsContent value="staff" className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => handleExport("staff")}>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Staff Summary by Department</CardTitle>
                <CardDescription>
                  Overview of staff distribution and leave status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {staffData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No staff data available.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Department</TableHead>
                        <TableHead className="text-right">Total Staff</TableHead>
                        <TableHead className="text-right">Active</TableHead>
                        <TableHead className="text-right">On Leave</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staffData.map((row) => (
                        <TableRow key={row.department}>
                          <TableCell className="font-medium">{row.department}</TableCell>
                          <TableCell className="text-right">{row.totalStaff}</TableCell>
                          <TableCell className="text-right text-green-600">{row.active}</TableCell>
                          <TableCell className="text-right text-orange-600">{row.onLeave}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={row.onLeave === 0 ? "default" : "secondary"}>
                              {row.onLeave === 0 ? "Full" : `${row.onLeave} on leave`}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
