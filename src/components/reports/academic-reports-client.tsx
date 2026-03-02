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
  BarChart3,
  Download,
  Loader2,
  TrendingUp,
  TrendingDown,
  Users,
  BookOpen,
} from "lucide-react";
import { exportAcademicReportToPDF } from "@/lib/export-pdf";
import { exportAcademicReportToExcel } from "@/lib/export-excel";

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

interface AcademicReport {
  classId: string;
  className: string;
  totalStudents: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
}

interface AcademicReportsClientProps {
  academicYears: AcademicYear[];
  classes: ClassWithSection[];
}

export function AcademicReportsClient({
  academicYears,
  classes,
}: AcademicReportsClientProps) {
  const [selectedYear, setSelectedYear] = useState<string>(
    academicYears.find((y) => y.isCurrent)?.id || ""
  );
  const [loading, setLoading] = useState(false);
  const [academicData, setAcademicData] = useState<AcademicReport[]>([]);
  const [trendData, setTrendData] = useState<{ month: string; avgScore: number }[]>([]);

  useEffect(() => {
    if (selectedYear) {
      fetchAcademicReport();
    }
  }, [selectedYear]);

  const fetchAcademicReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/finance/reports?type=academic&academicYearId=${selectedYear}`
      );
      if (res.ok) {
        const data = await res.json();
        setAcademicData(data.academic || []);
        
        // Generate mock trend data for visualization
        const months = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];
        const trend = months.map((month, idx) => ({
          month,
          avgScore: 65 + Math.random() * 20 + idx * 1.5,
        }));
        setTrendData(trend);
      }
    } catch (error) {
      console.error("Failed to fetch academic report:", error);
      toast.error("Failed to load academic report");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (academicData.length === 0) {
      toast.error("No data to export");
      return;
    }
    const yearName = academicYears.find((y) => y.id === selectedYear)?.name || "Report";
    exportAcademicReportToPDF(academicData, yearName);
    toast.success("PDF exported successfully");
  };

  const handleExportExcel = () => {
    if (academicData.length === 0) {
      toast.error("No data to export");
      return;
    }
    const yearName = academicYears.find((y) => y.id === selectedYear)?.name || "Report";
    exportAcademicReportToExcel(academicData, yearName);
    toast.success("Excel exported successfully");
  };

  const overallStats = {
    totalStudents: academicData.reduce((sum, d) => sum + d.totalStudents, 0),
    avgScore: academicData.length > 0
      ? academicData.reduce((sum, d) => sum + d.averageScore, 0) / academicData.length
      : 0,
    avgPassRate: academicData.length > 0
      ? academicData.reduce((sum, d) => sum + d.passRate, 0) / academicData.length
      : 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Academic Reports
          </h1>
          <p className="text-muted-foreground">
            View academic performance reports and analytics
          </p>
        </div>

        <div className="flex gap-2">
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
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <TrendingUp className="h-4 w-4" />
                  Average Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600">
                  {overallStats.avgScore.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Pass Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">
                  {overallStats.avgPassRate.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance by Class</CardTitle>
                <CardDescription>Average scores across all classes</CardDescription>
              </CardHeader>
              <CardContent>
                {academicData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={academicData.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="className" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="averageScore" fill="#3b82f6" name="Avg Score %" />
                      <Bar dataKey="passRate" fill="#22c55e" name="Pass Rate %" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Trend</CardTitle>
                <CardDescription>Monthly average score progression</CardDescription>
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
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis domain={[50, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="avgScore"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="Avg Score %"
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
              <CardTitle>Class-wise Performance Details</CardTitle>
              <CardDescription>
                Detailed academic performance for each class
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
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
                  {academicData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No academic data available for the selected year.
                      </TableCell>
                    </TableRow>
                  ) : (
                    academicData.map((row) => (
                      <TableRow key={row.classId}>
                        <TableCell className="font-medium">{row.className}</TableCell>
                        <TableCell className="text-right">{row.totalStudents}</TableCell>
                        <TableCell className="text-right">{row.averageScore.toFixed(1)}%</TableCell>
                        <TableCell className="text-right text-green-600">
                          {row.highestScore.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {row.lowestScore.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              row.passRate >= 80
                                ? "default"
                                : row.passRate >= 60
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {row.passRate.toFixed(1)}%
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
