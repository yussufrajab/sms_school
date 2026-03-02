"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Users,
  Download,
  Loader2,
  UserCheck,
  UserX,
  Briefcase,
  Building,
} from "lucide-react";
import { exportStaffReportToPDF } from "@/lib/export-pdf";
import { exportStaffReportToExcel } from "@/lib/export-excel";

interface StaffReport {
  department: string;
  totalStaff: number;
  onLeave: number;
  active: number;
}

interface StaffDetails {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  department: string;
  designation: string;
  status: string;
}

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export function StaffReportsClient() {
  const [loading, setLoading] = useState(false);
  const [staffData, setStaffData] = useState<StaffReport[]>([]);
  const [staffDetails, setStaffDetails] = useState<StaffDetails[]>([]);

  useEffect(() => {
    fetchStaffReport();
  }, []);

  const fetchStaffReport = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staff");
      if (res.ok) {
        const data = await res.json();
        
        // Transform staff data for report
        const departments: Record<string, StaffReport> = {};
        const details: StaffDetails[] = [];
        
        data.forEach((s: { 
          id: string;
          employeeId: string;
          firstName: string;
          lastName: string;
          department?: string | null;
          designation?: string | null;
          isActive: boolean;
        }) => {
          const dept = s.department || "Unassigned";
          if (!departments[dept]) {
            departments[dept] = { department: dept, totalStaff: 0, onLeave: 0, active: 0 };
          }
          departments[dept].totalStaff++;
          if (s.isActive) {
            departments[dept].active++;
          } else {
            departments[dept].onLeave++;
          }
          
          details.push({
            id: s.id,
            employeeId: s.employeeId,
            firstName: s.firstName,
            lastName: s.lastName,
            department: dept,
            designation: s.designation || "N/A",
            status: s.isActive ? "Active" : "Inactive",
          });
        });
        
        setStaffData(Object.values(departments));
        setStaffDetails(details);
      }
    } catch (error) {
      console.error("Failed to fetch staff report:", error);
      toast.error("Failed to load staff report");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (staffData.length === 0) {
      toast.error("No data to export");
      return;
    }
    exportStaffReportToPDF(staffData);
    toast.success("PDF exported successfully");
  };

  const handleExportExcel = () => {
    if (staffData.length === 0) {
      toast.error("No data to export");
      return;
    }
    exportStaffReportToExcel(staffData, staffDetails);
    toast.success("Excel exported successfully");
  };

  const overallStats = {
    totalStaff: staffData.reduce((sum, d) => sum + d.totalStaff, 0),
    totalActive: staffData.reduce((sum, d) => sum + d.active, 0),
    totalOnLeave: staffData.reduce((sum, d) => sum + d.onLeave, 0),
    departments: staffData.length,
  };

  const pieData = staffData.map((d) => ({
    name: d.department,
    value: d.totalStaff,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Staff Reports
          </h1>
          <p className="text-muted-foreground">
            View staff distribution and performance analytics
          </p>
        </div>
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
                  Total Staff
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{overallStats.totalStaff}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-green-500" />
                  Active Staff
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">
                  {overallStats.totalActive}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <UserX className="h-4 w-4 text-orange-500" />
                  On Leave / Inactive
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-orange-600">
                  {overallStats.totalOnLeave}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Departments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600">
                  {overallStats.departments}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Staff by Department</CardTitle>
                <CardDescription>Number of staff in each department</CardDescription>
              </CardHeader>
              <CardContent>
                {staffData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={staffData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="department" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="active" stackId="a" fill="#22c55e" name="Active" />
                      <Bar dataKey="onLeave" stackId="a" fill="#f59e0b" name="On Leave" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Department Distribution</CardTitle>
                <CardDescription>Staff distribution across departments</CardDescription>
              </CardHeader>
              <CardContent>
                {pieData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
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
              <CardTitle>Staff Summary by Department</CardTitle>
              <CardDescription>
                Overview of staff distribution and leave status
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
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
                  {staffData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No staff data available.
                      </TableCell>
                    </TableRow>
                  ) : (
                    staffData.map((row) => (
                      <TableRow key={row.department}>
                        <TableCell className="font-medium flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          {row.department}
                        </TableCell>
                        <TableCell className="text-right">{row.totalStaff}</TableCell>
                        <TableCell className="text-right text-green-600">
                          {row.active}
                        </TableCell>
                        <TableCell className="text-right text-orange-600">
                          {row.onLeave}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={row.onLeave === 0 ? "default" : "secondary"}>
                            {row.onLeave === 0 ? "Full" : `${row.onLeave} on leave`}
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