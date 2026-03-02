"use client";

import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Plus,
  Receipt,
  Loader2,
  Search,
  Eye,
  CheckCircle,
  Lock,
  Calendar,
  DollarSign,
  Users,
} from "lucide-react";
import { getInitials, formatCurrency, formatDate } from "@/lib/utils";

type PayrollStatus = "DRAFT" | "APPROVED" | "LOCKED";

interface PayrollItem {
  id: string;
  staffId: string;
  staff: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    department?: string | null;
    designation?: string | null;
    user: {
      email: string;
      image?: string | null;
    };
  };
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  grossSalary: number;
  taxDeduction: number;
  pensionDeduction: number;
  healthDeduction: number;
  leaveDeduction: number;
  netSalary: number;
}

interface Payroll {
  id: string;
  academicYearId: string;
  academicYear: string;
  month: number;
  year: number;
  totalAmount: number;
  isApproved: boolean;
  isLocked: boolean;
  status: "DRAFT" | "APPROVED" | "LOCKED";
  createdAt: string;
  itemCount: number;
  items: PayrollItem[];
}

interface AcademicYear {
  id: string;
  name: string;
}

interface PayrollClientProps {
  payrolls: Payroll[];
  academicYears: AcademicYear[];
}

const generatePayrollSchema = z.object({
  academicYearId: z.string().min(1, "Academic year is required"),
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2100),
});

type GeneratePayrollFormData = z.infer<typeof generatePayrollSchema>;

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const statusColors: Record<PayrollStatus, string> = {
  DRAFT: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  LOCKED: "bg-blue-100 text-blue-800",
};

function GeneratePayrollForm({
  academicYears,
  onSuccess,
  onCancel,
}: {
  academicYears: AcademicYear[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<GeneratePayrollFormData>({
    resolver: zodResolver(generatePayrollSchema),
    defaultValues: {
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
    },
  });

  const onSubmit = async (data: GeneratePayrollFormData) => {
    try {
      const res = await fetch("/api/hr/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to generate payroll");
      }

      toast.success("Payroll generated successfully");
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate payroll");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>Academic Year *</Label>
        <Select onValueChange={(v) => setValue("academicYearId", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select academic year" />
          </SelectTrigger>
          <SelectContent>
            {academicYears.map((ay) => (
              <SelectItem key={ay.id} value={ay.id}>
                {ay.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.academicYearId && (
          <p className="text-xs text-destructive">{errors.academicYearId.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Month *</Label>
          <Select
            defaultValue={String(new Date().getMonth() + 1)}
            onValueChange={(v) => setValue("month", parseInt(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthNames.map((name, index) => (
                <SelectItem key={index} value={String(index + 1)}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="year">Year *</Label>
          <Input
            id="year"
            type="number"
            defaultValue={new Date().getFullYear()}
            onChange={(e) => setValue("year", parseInt(e.target.value))}
          />
          {errors.year && <p className="text-xs text-destructive">{errors.year.message}</p>}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate Payroll"
          )}
        </Button>
      </div>
    </form>
  );
}

function PayrollDetailsDialog({ payroll }: { payroll: Payroll }) {
  return (
    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          Payroll - {monthNames[payroll.month - 1]} {payroll.year}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge className={statusColors[payroll.status]}>
              {payroll.status}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {payroll.academicYear}
            </span>
          </div>
          <p className="text-lg font-bold">
            Total: {formatCurrency(payroll.totalAmount)}
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff Member</TableHead>
              <TableHead className="text-right">Basic</TableHead>
              <TableHead className="text-right">Allowances</TableHead>
              <TableHead className="text-right">Deductions</TableHead>
              <TableHead className="text-right">Net Salary</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payroll.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={item.staff.user.image ?? undefined} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(`${item.staff.firstName} ${item.staff.lastName}`)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">
                        {item.staff.firstName} {item.staff.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.staff.employeeId}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrency(item.basicSalary)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrency(item.housingAllowance + item.transportAllowance)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-red-600">
                  {formatCurrency(
                    item.taxDeduction + item.pensionDeduction + item.healthDeduction + item.leaveDeduction
                  )}
                </TableCell>
                <TableCell className="text-right font-mono text-sm font-medium text-green-600">
                  {formatCurrency(item.netSalary)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DialogContent>
  );
}

export function PayrollClient({
  payrolls: initialPayrolls,
  academicYears,
}: PayrollClientProps) {
  const [payrolls, setPayrolls] = useState(initialPayrolls);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [generateOpen, setGenerateOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);

  const fetchPayrolls = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);

      const res = await fetch(`/api/hr/payroll?${params}`);
      const json = await res.json();
      setPayrolls(json);
    } catch {
      toast.error("Failed to load payrolls");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchPayrolls();
  }, [fetchPayrolls]);

  const handleStatusUpdate = async (id: string, action: "approve" | "lock") => {
    try {
      const res = await fetch(`/api/hr/payroll/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to update status");
      }

      toast.success(`Payroll ${action === "approve" ? "approved" : "locked"}`);
      fetchPayrolls();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update status");
    }
  };

  const filteredPayrolls = payrolls.filter((payroll) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      monthNames[payroll.month - 1].toLowerCase().includes(searchLower) ||
      payroll.academicYear.toLowerCase().includes(searchLower) ||
      String(payroll.year).includes(searchLower);
    return matchesSearch;
  });

  // Calculate totals
  const totalAmount = payrolls.reduce((sum, p) => sum + p.totalAmount, 0);
  const draftCount = payrolls.filter((p) => p.status === "DRAFT").length;
  const approvedCount = payrolls.filter((p) => p.status === "APPROVED").length;
  const lockedCount = payrolls.filter((p) => p.status === "LOCKED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" />
            Payroll Management
          </h1>
          <p className="text-muted-foreground">
            Generate and manage staff payroll
          </p>
        </div>

        <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Generate Payroll
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Generate New Payroll</DialogTitle>
            </DialogHeader>
            <GeneratePayrollForm
              academicYears={academicYears}
              onSuccess={() => {
                setGenerateOpen(false);
                fetchPayrolls();
              }}
              onCancel={() => setGenerateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              Total Payroll
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-yellow-600" />
              Draft
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{draftCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Lock className="h-4 w-4 text-blue-600" />
              Locked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{lockedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by month, year, or academic year..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="LOCKED">Locked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Payroll History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Academic Year</TableHead>
                <TableHead className="text-center">Staff Count</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredPayrolls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No payrolls found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayrolls.map((payroll) => (
                  <TableRow key={payroll.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      {monthNames[payroll.month - 1]} {payroll.year}
                    </TableCell>
                    <TableCell className="text-sm">{payroll.academicYear}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        {payroll.itemCount}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(payroll.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[payroll.status]}>
                        {payroll.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(payroll.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </DialogTrigger>
                          <PayrollDetailsDialog payroll={payroll} />
                        </Dialog>
                        {payroll.status === "DRAFT" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600 hover:text-green-700"
                            onClick={() => handleStatusUpdate(payroll.id, "approve")}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {payroll.status === "APPROVED" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700"
                            onClick={() => handleStatusUpdate(payroll.id, "lock")}
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}