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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Briefcase,
  Loader2,
  Search,
  Filter,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Flag,
  Droplets,
  AlertTriangle,
  GraduationCap,
} from "lucide-react";
import { getInitials, formatDate } from "@/lib/utils";

interface StaffMember {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  nationality?: string | null;
  phone?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
  department?: string | null;
  designation?: string | null;
  employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACT";
  startDate: string;
  qualifications?: string | null;
  photoUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  user: {
    email: string;
    name?: string | null;
    image?: string | null;
  };
  salaryStructure?: {
    basicSalary: number;
    housingAllowance: number;
    transportAllowance: number;
  } | null;
  _count: { teachingAssignments: number };
}

interface StaffClientProps {
  staff: StaffMember[];
  departments: string[];
  canManage: boolean;
}

const staffSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT"]),
  startDate: z.string().min(1, "Start date is required"),
  gender: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
});

type StaffFormData = z.infer<typeof staffSchema>;

function AddStaffForm({
  departments,
  onSuccess,
}: {
  departments: string[];
  onSuccess: () => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: { employmentType: "FULL_TIME" },
  });

  const onSubmit = async (data: StaffFormData) => {
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create staff member");
      }

      toast.success("Staff member created successfully");
      reset();
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create staff member"
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input id="firstName" {...register("firstName")} />
          {errors.firstName && (
            <p className="text-xs text-destructive">{errors.firstName.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input id="lastName" {...register("lastName")} />
          {errors.lastName && (
            <p className="text-xs text-destructive">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input id="email" type="email" {...register("email")} />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" {...register("phone")} />
        </div>
        <div className="space-y-2">
          <Label>Gender</Label>
          <Select onValueChange={(v) => setValue("gender", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MALE">Male</SelectItem>
              <SelectItem value="FEMALE">Female</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Department</Label>
          <Select onValueChange={(v) => setValue("department", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
              <SelectItem value="NEW">+ Add New Department</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="designation">Designation</Label>
          <Input
            id="designation"
            placeholder="e.g. Senior Teacher"
            {...register("designation")}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Employment Type</Label>
          <Select
            defaultValue="FULL_TIME"
            onValueChange={(v) =>
              setValue("employmentType", v as "FULL_TIME" | "PART_TIME" | "CONTRACT")
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FULL_TIME">Full Time</SelectItem>
              <SelectItem value="PART_TIME">Part Time</SelectItem>
              <SelectItem value="CONTRACT">Contract</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date *</Label>
          <Input id="startDate" type="date" {...register("startDate")} />
          {errors.startDate && (
            <p className="text-xs text-destructive">{errors.startDate.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Initial Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="Min 8 characters"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Staff Member"
          )}
        </Button>
      </div>
    </form>
  );
}

export function StaffClient({
  staff: initialStaff,
  departments,
  canManage,
}: StaffClientProps) {
  const [staff, setStaff] = useState(initialStaff);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [viewStaff, setViewStaff] = useState<StaffMember | null>(null);
  const [editStaff, setEditStaff] = useState<StaffMember | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<StaffMember | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(search ? { search } : {}),
        ...(departmentFilter !== "ALL"
          ? { department: departmentFilter }
          : {}),
        ...(statusFilter !== "ALL" ? { isActive: statusFilter } : {}),
      });

      const res = await fetch(`/api/staff?${params}`);
      const json = await res.json();
      setStaff(json.data ?? []);
      setTotalPages(json.pagination?.totalPages ?? 1);
    } catch {
      toast.error("Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, [page, search, departmentFilter, statusFilter]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleDelete = async (member: StaffMember) => {
    try {
      const res = await fetch(`/api/staff/${member.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success(`${member.firstName} ${member.lastName} deleted`);
      fetchStaff();
    } catch {
      toast.error("Failed to delete staff member");
    }
  };

  const handleEditSave = async () => {
    if (!editStaff) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/staff/${editStaff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editStaff.firstName,
          lastName: editStaff.lastName,
          department: editStaff.department || undefined,
          designation: editStaff.designation || undefined,
          employmentType: editStaff.employmentType,
          phone: editStaff.phone || undefined,
          gender: editStaff.gender || undefined,
          nationality: editStaff.nationality || undefined,
          address: editStaff.address || undefined,
          emergencyContact: editStaff.emergencyContact || undefined,
          qualifications: editStaff.qualifications || undefined,
          isActive: editStaff.isActive,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to update");
      }
      toast.success("Staff member updated");
      setEditStaff(null);
      fetchStaff();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update staff member"
      );
    } finally {
      setSaving(false);
    }
  };

  const activeStaff = staff.filter((s) => s.isActive);
  const inactiveStaff = staff.filter((s) => !s.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            Staff
          </h1>
          <p className="text-muted-foreground">
            {activeStaff.length} active · {inactiveStaff.length} inactive
          </p>
        </div>

        {canManage && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Staff
            </Button>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Staff Member</DialogTitle>
              </DialogHeader>
              <AddStaffForm
                departments={departments}
                onSuccess={() => {
                  setAddOpen(false);
                  fetchStaff();
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{staff.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {activeStaff.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Departments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              {departments.length}
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
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={departmentFilter}
              onValueChange={(v) => {
                setDepartmentFilter(v);
                setPage(1);
              }}
            >
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
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Staff List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
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
              ) : staff.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-12 text-muted-foreground"
                  >
                    No staff members found
                  </TableCell>
                </TableRow>
              ) : (
                staff.map((member) => (
                  <TableRow
                    key={member.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => setViewStaff(member)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={
                              member.photoUrl ?? member.user?.image ?? undefined
                            }
                          />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {getInitials(
                              `${member.firstName} ${member.lastName}`
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {member.firstName} {member.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.user?.email ?? "—"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {member.employeeId}
                    </TableCell>
                    <TableCell className="text-sm">
                      {member.department ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {member.designation ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {member.employmentType?.replace("_", " ") ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-xs ${
                          member.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {member.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setViewStaff(member)}
                          title="View details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        {canManage && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditStaff(member)}
                              title="Edit staff"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirm(member)}
                              title="Delete staff"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Staff Dialog */}
      <Dialog
        open={!!viewStaff}
        onOpenChange={(open) => !open && setViewStaff(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={viewStaff?.photoUrl ?? viewStaff?.user?.image ?? undefined}
                />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(
                    `${viewStaff?.firstName ?? ""} ${viewStaff?.lastName ?? ""}`
                  )}
                </AvatarFallback>
              </Avatar>
              <div>
                <span>
                  {viewStaff?.firstName} {viewStaff?.lastName}
                </span>
                <p className="text-sm font-normal text-muted-foreground">
                  {viewStaff?.employeeId}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
          {viewStaff && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoItem icon={Mail} label="Email" value={viewStaff.user?.email} />
                <InfoItem
                  icon={Phone}
                  label="Phone"
                  value={viewStaff.phone}
                />
                <InfoItem
                  icon={Calendar}
                  label="Start Date"
                  value={formatDate(viewStaff.startDate)}
                />
                <InfoItem
                  icon={Calendar}
                  label="Date of Birth"
                  value={
                    viewStaff.dateOfBirth
                      ? new Date(viewStaff.dateOfBirth).toLocaleDateString()
                      : undefined
                  }
                />
                <InfoItem
                  icon={Briefcase}
                  label="Department"
                  value={viewStaff.department}
                />
                <InfoItem
                  icon={GraduationCap}
                  label="Designation"
                  value={viewStaff.designation}
                />
                <InfoItem
                  icon={Flag}
                  label="Nationality"
                  value={viewStaff.nationality}
                />
                <InfoItem
                  icon={Droplets}
                  label="Qualifications"
                  value={viewStaff.qualifications}
                />
                <InfoItem
                  icon={AlertTriangle}
                  label="Emergency Contact"
                  value={viewStaff.emergencyContact}
                />
                <InfoItem
                  icon={MapPin}
                  label="Address"
                  value={viewStaff.address}
                />
              </div>
              {viewStaff.salaryStructure && (
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Salary Structure
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Basic</p>
                      <p className="font-medium">
                        {viewStaff.salaryStructure.basicSalary.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Housing</p>
                      <p className="font-medium">
                        {viewStaff.salaryStructure.housingAllowance.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Transport</p>
                      <p className="font-medium">
                        {viewStaff.salaryStructure.transportAllowance.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between pt-2">
                <Badge
                  className={`${
                    viewStaff.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {viewStaff.isActive ? "Active" : "Inactive"}
                </Badge>
                <Badge variant="outline">
                  {viewStaff.employmentType?.replace("_", " ")}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Staff Dialog */}
      <Dialog
        open={!!editStaff}
        onOpenChange={(open) => !open && setEditStaff(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit {editStaff?.firstName} {editStaff?.lastName}
            </DialogTitle>
          </DialogHeader>
          {editStaff && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    value={editStaff.firstName}
                    onChange={(e) =>
                      setEditStaff({ ...editStaff, firstName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    value={editStaff.lastName}
                    onChange={(e) =>
                      setEditStaff({ ...editStaff, lastName: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select
                    value={editStaff.department ?? "NONE"}
                    onValueChange={(v) =>
                      setEditStaff({
                        ...editStaff,
                        department: v === "NONE" ? null : v,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Not assigned</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Designation</Label>
                  <Input
                    value={editStaff.designation ?? ""}
                    onChange={(e) =>
                      setEditStaff({
                        ...editStaff,
                        designation: e.target.value || null,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Employment Type</Label>
                  <Select
                    value={editStaff.employmentType}
                    onValueChange={(v) =>
                      setEditStaff({
                        ...editStaff,
                        employmentType: v as "FULL_TIME" | "PART_TIME" | "CONTRACT",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FULL_TIME">Full Time</SelectItem>
                      <SelectItem value="PART_TIME">Part Time</SelectItem>
                      <SelectItem value="CONTRACT">Contract</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editStaff.isActive ? "true" : "false"}
                    onValueChange={(v) =>
                      setEditStaff({ ...editStaff, isActive: v === "true" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select
                    value={editStaff.gender ?? "NONE"}
                    onValueChange={(v) =>
                      setEditStaff({
                        ...editStaff,
                        gender: v === "NONE" ? null : v,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Not specified</SelectItem>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nationality</Label>
                  <Input
                    value={editStaff.nationality ?? ""}
                    onChange={(e) =>
                      setEditStaff({
                        ...editStaff,
                        nationality: e.target.value || null,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={editStaff.phone ?? ""}
                    onChange={(e) =>
                      setEditStaff({
                        ...editStaff,
                        phone: e.target.value || null,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Emergency Contact</Label>
                  <Input
                    value={editStaff.emergencyContact ?? ""}
                    onChange={(e) =>
                      setEditStaff({
                        ...editStaff,
                        emergencyContact: e.target.value || null,
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Qualifications</Label>
                <Textarea
                  value={editStaff.qualifications ?? ""}
                  rows={2}
                  onChange={(e) =>
                    setEditStaff({
                      ...editStaff,
                      qualifications: e.target.value || null,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Textarea
                  value={editStaff.address ?? ""}
                  rows={2}
                  onChange={(e) =>
                    setEditStaff({
                      ...editStaff,
                      address: e.target.value || null,
                    })
                  }
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setEditStaff(null)}
                >
                  Cancel
                </Button>
                <Button onClick={handleEditSave} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete staff member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate{" "}
              {deleteConfirm?.firstName} {deleteConfirm?.lastName} (
              {deleteConfirm?.employeeId}). Their account will be marked as
              inactive. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirm) handleDelete(deleteConfirm);
                setDeleteConfirm(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
  capitalize,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
  capitalize?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-2 text-sm ${className ?? ""}`}>
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className={capitalize ? "capitalize" : ""}>{value || "—"}</p>
      </div>
    </div>
  );
}