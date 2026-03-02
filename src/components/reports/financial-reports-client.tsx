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
  DollarSign,
  Download,
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { exportFinancialReportToPDF } from "@/lib/export-pdf";
import { exportFinancialReportToExcel } from "@/lib/export-excel";

interface AcademicYear {
  id: string;
  name: string;
  isCurrent: boolean;
}

interface FinancialReport {
  totalInvoiced: number;
  totalCollected: number;
  totalOutstanding: number;
  collectionRate: number;
  overdueAmount: number;
}

interface MonthlyData {
  month: string;
  invoiced: number;
  collected: number;
}

interface FinancialReportsClientProps {
  academicYears: AcademicYear[];
}

const COLORS = ["#22c55e", "#f59e0b", "#ef4444"];

export function FinancialReportsClient({
  academicYears,
}: FinancialReportsClientProps) {
  const [selectedYear, setSelectedYear] = useState<string>(
    academicYears.find((y) => y.isCurrent)?.id || ""
  );
  const [loading, setLoading] = useState(false);
  const [financialData, setFinancialData] = useState<FinancialReport | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);

  useEffect(() => {
    if (selectedYear) {
      fetchFinancialReport();
    }
  }, [selectedYear]);

  const fetchFinancialReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/finance/reports?type=financial&academicYearId=${selectedYear}`
      );
      if (res.ok) {
        const data = await res.json();
        setFinancialData(data.financial || null);
        
        // Generate mock monthly data
        const months = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];
        const monthly = months.map((month) => ({
          month,
          invoiced: Math.floor(50000 + Math.random() * 30000),
          collected: Math.floor(40000 + Math.random() * 25000),
        }));
        setMonthlyData(monthly);
      }
    } catch (error) {
      console.error("Failed to fetch financial report:", error);
      toast.error("Failed to load financial report");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (!financialData) {
      toast.error("No data to export");
      return;
    }
    const yearName = academicYears.find((y) => y.id === selectedYear)?.name || "Report";
    exportFinancialReportToPDF(financialData, yearName);
    toast.success("PDF exported successfully");
  };

  const handleExportExcel = () => {
    if (!financialData) {
      toast.error("No data to export");
      return;
    }
    const yearName = academicYears.find((y) => y.id === selectedYear)?.name || "Report";
    exportFinancialReportToExcel(financialData, yearName);
    toast.success("Excel exported successfully");
  };

  const pieData = financialData
    ? [
        { name: "Collected", value: financialData.totalCollected },
        { name: "Outstanding", value: financialData.totalOutstanding - financialData.overdueAmount },
        { name: "Overdue", value: financialData.overdueAmount },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            Financial Reports
          </h1>
          <p className="text-muted-foreground">
            View financial reports and fee collection analytics
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Invoiced
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  ${financialData?.totalInvoiced.toLocaleString() || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Total Collected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">
                  ${financialData?.totalCollected.toLocaleString() || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-orange-500" />
                  Outstanding Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-orange-600">
                  ${financialData?.totalOutstanding.toLocaleString() || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Overdue Amount
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-600">
                  ${financialData?.overdueAmount.toLocaleString() || 0}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Collection Rate Card */}
          <Card>
            <CardHeader>
              <CardTitle>Collection Rate</CardTitle>
              <CardDescription>Overall fee collection efficiency</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="text-5xl font-bold text-primary">
                  {financialData?.collectionRate.toFixed(1) || 0}%
                </div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${financialData?.collectionRate || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Collection</CardTitle>
                <CardDescription>Invoiced vs Collected amounts</CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v) => `${v / 1000}k`} />
                      <Tooltip formatter={(v) => v !== undefined ? `${Number(v).toLocaleString()}` : ''} />
                      <Legend />
                      <Bar dataKey="invoiced" fill="#3b82f6" name="Invoiced" />
                      <Bar dataKey="collected" fill="#22c55e" name="Collected" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Collection Distribution</CardTitle>
                <CardDescription>Breakdown of fee collection status</CardDescription>
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
                      <Tooltip formatter={(v) => v !== undefined ? `${Number(v).toLocaleString()}` : ''} />
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
        </>
      )}
    </div>
  );
}