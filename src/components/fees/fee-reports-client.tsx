"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { TrendingUp, TrendingDown, DollarSign, Users, AlertCircle } from "lucide-react";

type AcademicYear = { id: string; name: string; isCurrent: boolean };

type Defaulter = {
  student: {
    id: string;
    studentId: string;
    firstName: string;
    lastName: string;
    section?: { name: string; class: { name: string } } | null;
  };
  totalDue: number;
  invoiceCount: number;
  oldestDueDate: Date;
};

type MonthlyData = {
  month: string;
  collected: number;
  count: number;
};

interface FeeReportsClientProps {
  academicYears: AcademicYear[];
}

export function FeeReportsClient({ academicYears }: FeeReportsClientProps) {
  const [selectedYear, setSelectedYear] = useState<string>(
    academicYears.find((y) => y.isCurrent)?.id || ""
  );
  const [loading, setLoading] = useState(false);
  
  // Report data
  const [summary, setSummary] = useState<{
    totalInvoiced: number;
    totalCollected: number;
    totalPending: number;
    collectionRate: string;
    invoiceCount: number;
    paidInvoiceCount: number;
  } | null>(null);
  const [statusBreakdown, setStatusBreakdown] = useState<Record<string, number>>({});
  const [paymentMethods, setPaymentMethods] = useState<Record<string, number>>({});
  const [defaulters, setDefaulters] = useState<Defaulter[]>([]);
  const [monthlyCollection, setMonthlyCollection] = useState<MonthlyData[]>([]);

  useEffect(() => {
    if (selectedYear) {
      fetchReports();
    }
  }, [selectedYear]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // Fetch all report types in parallel
      const [summaryRes, defaultersRes, monthlyRes] = await Promise.all([
        fetch(`/api/finance/reports?academicYearId=${selectedYear}&type=summary`),
        fetch(`/api/finance/reports?academicYearId=${selectedYear}&type=defaulters`),
        fetch(`/api/finance/reports?academicYearId=${selectedYear}&type=monthly`),
      ]);

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data.summary);
        setStatusBreakdown(data.statusBreakdown);
        setPaymentMethods(data.paymentMethodBreakdown);
      }

      if (defaultersRes.ok) {
        const data = await defaultersRes.json();
        setDefaulters(data.defaulters);
      }

      if (monthlyRes.ok) {
        const data = await monthlyRes.json();
        setMonthlyCollection(data.monthlyCollection);
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const collectionRate = summary ? parseFloat(summary.collectionRate) : 0;

  return (
    <div className="space-y-4">
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

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading reports...</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Total Invoiced
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  TZS {summary?.totalInvoiced.toLocaleString() || 0}
                </div>
                <div className="text-sm text-muted-foreground">
                  {summary?.invoiceCount || 0} invoices
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Total Collected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  TZS {summary?.totalCollected.toLocaleString() || 0}
                </div>
                <div className="text-sm text-muted-foreground">
                  {summary?.paidInvoiceCount || 0} fully paid
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  Total Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  TZS {summary?.totalPending.toLocaleString() || 0}
                </div>
                <div className="text-sm text-muted-foreground">
                  {defaulters.length} defaulters
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
                <div className="text-2xl font-bold">{collectionRate}%</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full ${
                      collectionRate >= 80
                        ? "bg-green-500"
                        : collectionRate >= 50
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${Math.min(collectionRate, 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Breakdown & Payment Methods */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Invoice Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(statusBreakdown).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            status === "PAID"
                              ? "default"
                              : status === "OVERDUE"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {status.replace("_", " ")}
                        </Badge>
                      </div>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Methods</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(paymentMethods).length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">
                    No payments recorded yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(paymentMethods).map(([method, amount]) => (
                      <div key={method} className="flex justify-between items-center">
                        <span className="text-sm">{method.replace("_", " ")}</span>
                        <span className="font-medium">TZS {amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Monthly Collection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Monthly Collection Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyCollection.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  No payment data available
                </div>
              ) : (
                <div className="space-y-2">
                  {monthlyCollection.slice(-6).map((data) => (
                    <div key={data.month} className="flex items-center gap-4">
                      <div className="w-24 text-sm">{data.month}</div>
                      <div className="flex-1 bg-gray-100 rounded-full h-4">
                        <div
                          className="bg-green-500 h-4 rounded-full"
                          style={{
                            width: `${
                              summary?.totalCollected
                                ? (data.collected / summary.totalCollected) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <div className="w-24 text-right text-sm font-medium">
                        TZS {data.collected.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Defaulters List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Defaulters List
                <Badge variant="destructive">{defaulters.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {defaulters.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  No defaulters found. All invoices are paid!
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead className="text-right">Amount Due</TableHead>
                      <TableHead>Invoices</TableHead>
                      <TableHead>Oldest Due</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {defaulters.slice(0, 20).map((defaulter) => (
                      <TableRow key={defaulter.student.id}>
                        <TableCell className="font-mono">
                          {defaulter.student.studentId}
                        </TableCell>
                        <TableCell className="font-medium">
                          {defaulter.student.firstName} {defaulter.student.lastName}
                        </TableCell>
                        <TableCell>
                          {defaulter.student.section?.class.name} - {defaulter.student.section?.name}
                        </TableCell>
                        <TableCell className="text-right font-bold text-red-600">
                          TZS {defaulter.totalDue.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{defaulter.invoiceCount}</Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(defaulter.oldestDueDate), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
