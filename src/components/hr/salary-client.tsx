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
  DollarSign,
  Loader2,
  Search,
  Filter,
  Pencil,
  TrendingUp,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { getInitials, formatCurrency } from "@/lib/utils";

interface SalaryStructure {
  id: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  taxDeduction: number;
  pensionDeduction: number;
  healthDeduction: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
}

interface StaffData {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  department?: string | null;
  designation?: string | null;
  employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACT";
  isActive: boolean;
  user: {
    email: string;
    name?: string | null;
    image?: string | null;
  };
  salaryStructure: SalaryStructure | null;
}

interface SalaryClientProps {
  staffData: StaffData[];
  departments: string[];
}

const salarySchema = z.object({
  staffId: z.string().min(1, "Staff is required"),
  basicSalary: z.number().min(0, "Basic salary must be non-negative"),
  housingAllowance: z.number().min(0),
  transportAllowance: z.number().min(0),
  taxDeduction: z.number().min(0),
  pensionDeduction: z.number().min(0),
  healthDeduction: z.number().min(0),
});

type SalaryFormData = z.infer<typeof salarySchema>;

function SalaryForm({
  staff,
  onSuccess,
  onCancel,
}: {
  staff: StaffData;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SalaryFormData>({
    resolver: zodResolver(salarySchema),
    defaultValues: {
      staffId: staff.id,
      basicSalary: staff.salaryStructure?.basicSalary ?? 0,
      housingAllowance: staff.salaryStructure?.housingAllowance ?? 0,
      transportAllowance: staff.salaryStructure?.transportAllowance ?? 0,
      taxDeduction: staff.salaryStructure?.taxDeduction ?? 0,
      pensionDeduction: staff.salaryStructure?.pensionDeduction ?? 0,
      healthDeduction: staff.salaryStructure?.healthDeduction ?? 0,
    },
  });

  const onSubmit = async (data: SalaryFormData) => {
    try {
      const res = await fetch("/api/hr/salary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to save salary structure");
      }

      toast.success(
        staff.salaryStructure
          ? "Salary structure updated successfully"
          : "Salary structure created successfully"
      );
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save salary structure");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register("staffId")} />

      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg mb-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src={staff.user.image ?? undefined} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {getInitials(`${staff.firstName} ${staff.lastName}`)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">
            {staff.firstName} {staff.lastName}
          </p>
          <p className="text-sm text-muted-foreground">
            {staff.employeeId} · {staff.department ?? "N/A"}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Earnings</h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="basicSalary">Basic Salary *</Label>
            <Input
              id="basicSalary"
              type="number"
              step="0.01"
              {...register("basicSalary", { valueAsNumber: true })}
            />
            {errors.basicSalary && (
              <p className="text-xs text-destructive">{errors.basicSalary.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="housingAllowance">Housing Allowance</Label>
            <Input
              id="housingAllowance"
              type="number"
              step="0.01"
              {...register("housingAllowance", { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="transportAllowance">Transport Allowance</Label>
            <Input
              id="transportAllowance"
              type="number"
              step="0.01"
              {...register("transportAllowance", { valueAsNumber: true })}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Deductions</h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="taxDeduction">Tax Deduction</Label>
            <Input
              id="taxDeduction"
              type="number"
              step="0.01"
              {...register("taxDeduction", { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pensionDeduction">Pension Deduction</Label>
            <Input
              id="pensionDeduction"
              type="number"
              step="0.01"
              {...register("pensionDeduction", { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="healthDeduction">Health Deduction</Label>
            <Input
              id="healthDeduction"
              type="number"
              step="0.01"
              {...register("healthDeduction", { valueAsNumber: true })}
            />
          </div>
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
              Saving...
            </>
          ) : (
            "Save Salary Structure"
          )}
        </Button>
      </div>
    </form>
  );
}

export function SalaryClient({ staffData: initialStaffData, departments }: SalaryClientProps) {
  const [staffData, setStaffData] = useState(initialStaffData);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [salaryFilter, setSalaryFilter] = useState("ALL");
  const [editStaff, setEditStaff] = useState<StaffData | null>(null);

  const fetchStaffData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (departmentFilter !== "ALL") params.append("department", departmentFilter);

      const res = await fetch(`/api/hr/salary?${params}`);
      const json = await res.json();
      setStaffData(json);
    } catch {
      toast.error("Failed to load salary data");
    } finally {
      setLoading(false);
    }
  }, [departmentFilter]);

  useEffect(() => {
    fetchStaffData();
  }, [fetchStaffData]);

  const filteredStaff = staffData.filter((staff) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      staff.firstName.toLowerCase().includes(searchLower) ||
      staff.lastName.toLowerCase().includes(searchLower) ||
      staff.employeeId.toLowerCase().includes(searchLower);

    const matchesDepartment =
      departmentFilter === "ALL" || staff.department === departmentFilter;

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && staff.isActive) ||
      (statusFilter === "INACTIVE" && !staff.isActive);

    const matchesSalary =
      salaryFilter === "ALL" ||
      (salaryFilter === "SET" && staff.salaryStructure) ||
      (salaryFilter === "NOT_SET" && !staff.salaryStructure);

    return matchesSearch && matchesDepartment && matchesStatus && matchesSalary;
  });

  // Calculate totals
  const totalGross = staffData.reduce(
    (sum, s) => sum + (s.salaryStructure?.grossSalary ?? 0),
    0
  );
  const totalNet = staffData.reduce(
    (sum, s) => sum + (s.salaryStructure?.netSalary ?? 0),
    0
  );
  const totalDeductions = staffData.reduce(
    (sum, s) => sum + (s.salaryStructure?.totalDeductions ?? 0),
    0
  );
  const staffWithSalary = staffData.filter((s) => s.salaryStructure).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            Salary Structure
          </h1>
          <p className="text-muted-foreground">
            Manage staff salary structures and allowances
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4 text-blue-600" />
              Total Gross
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalGross)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              Total Deductions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDeductions)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Total Net
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalNet)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Staff with Salary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {staffWithSalary}/{staffData.length}
            </p>
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
                placeholder="Search by name or employee ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={salaryFilter} onValueChange={setSalaryFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Salary" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="SET">Salary Set</SelectItem>
                <SelectItem value="NOT_SET">No Salary</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Staff Salary List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Basic</TableHead>
                <TableHead className="text-right">Allowances</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right">Net Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredStaff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    No staff members found
                  </TableCell>
                </TableRow>
              ) : (
                filteredStaff.map((staff) => (
                  <TableRow key={staff.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={staff.user.image ?? undefined} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {getInitials(`${staff.firstName} ${staff.lastName}`)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {staff.firstName} {staff.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {staff.employeeId}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{staff.department ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {staff.salaryStructure
                        ? formatCurrency(staff.salaryStructure.basicSalary)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {staff.salaryStructure
                        ? formatCurrency(
                            staff.salaryStructure.housingAllowance +
                              staff.salaryStructure.transportAllowance
                          )
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-red-600">
                      {staff.salaryStructure
                        ? formatCurrency(staff.salaryStructure.totalDeductions)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium text-green-600">
                      {staff.salaryStructure
                        ? formatCurrency(staff.salaryStructure.netSalary)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-xs ${
                          staff.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {staff.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditStaff(staff)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editStaff} onOpenChange={(open) => !open && setEditStaff(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editStaff?.salaryStructure ? "Edit Salary Structure" : "Set Salary Structure"}
            </DialogTitle>
          </DialogHeader>
          {editStaff && (
            <SalaryForm
              staff={editStaff}
              onSuccess={() => {
                setEditStaff(null);
                fetchStaffData();
              }}
              onCancel={() => setEditStaff(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}