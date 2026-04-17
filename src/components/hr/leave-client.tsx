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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus,
  CalendarDays,
  Loader2,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { getInitials, formatDate } from "@/lib/utils";

type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
type LeaveType = "ANNUAL" | "SICK" | "MATERNITY" | "PATERNITY" | "UNPAID" | "EMERGENCY";

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  department?: string | null;
}

interface LeaveApplication {
  id: string;
  staffId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  fileUrl?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
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
}

interface LeaveClientProps {
  applications: LeaveApplication[];
  staffList: StaffMember[];
  canManage: boolean;
  isTeacher: boolean;
  currentStaffId: string | null;
}

const leaveSchema = z.object({
  staffId: z.string().min(1, "Staff is required"),
  type: z.enum(["ANNUAL", "SICK", "MATERNITY", "PATERNITY", "UNPAID", "EMERGENCY"]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().min(1, "Reason is required"),
});

type LeaveFormData = z.infer<typeof leaveSchema>;

const leaveTypeLabels: Record<LeaveType, string> = {
  ANNUAL: "Annual Leave",
  SICK: "Sick Leave",
  MATERNITY: "Maternity Leave",
  PATERNITY: "Paternity Leave",
  UNPAID: "Unpaid Leave",
  EMERGENCY: "Emergency Leave",
};

const statusColors: Record<LeaveStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-800",
};

function AddLeaveForm({
  staffList,
  currentStaffId,
  isTeacher,
  onSuccess,
}: {
  staffList: StaffMember[];
  currentStaffId: string | null;
  isTeacher: boolean;
  onSuccess: () => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeaveFormData>({
    resolver: zodResolver(leaveSchema),
    defaultValues: {
      staffId: currentStaffId || "",
      type: "ANNUAL",
    },
  });

  useEffect(() => {
    if (currentStaffId) {
      setValue("staffId", currentStaffId);
    }
  }, [currentStaffId, setValue]);

  const onSubmit = async (data: LeaveFormData) => {
    try {
      const res = await fetch("/api/hr/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to submit leave application");
      }

      toast.success("Leave application submitted successfully");
      reset();
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit leave application");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {!isTeacher && (
        <div className="space-y-2">
          <Label>Staff Member *</Label>
          <Select onValueChange={(v) => setValue("staffId", v)} defaultValue={currentStaffId || undefined}>
            <SelectTrigger>
              <SelectValue placeholder="Select staff member" />
            </SelectTrigger>
            <SelectContent>
              {staffList.map((staff) => (
                <SelectItem key={staff.id} value={staff.id}>
                  {staff.firstName} {staff.lastName} ({staff.employeeId})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.staffId && <p className="text-xs text-destructive">{errors.staffId.message}</p>}
        </div>
      )}

      <div className="space-y-2">
        <Label>Leave Type *</Label>
        <Select defaultValue="ANNUAL" onValueChange={(v) => setValue("type", v as LeaveType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(leaveTypeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date *</Label>
          <Input id="startDate" type="date" {...register("startDate")} />
          {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">End Date *</Label>
          <Input id="endDate" type="date" {...register("endDate")} />
          {errors.endDate && <p className="text-xs text-destructive">{errors.endDate.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Reason *</Label>
        <Textarea
          id="reason"
          placeholder="Please provide a reason for your leave request..."
          {...register("reason")}
        />
        {errors.reason && <p className="text-xs text-destructive">{errors.reason.message}</p>}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Application"
          )}
        </Button>
      </div>
    </form>
  );
}

function LeaveDetailsDialog({ application }: { application: LeaveApplication }) {
  const startDate = new Date(application.startDate);
  const endDate = new Date(application.endDate);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Leave Application Details</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={application.staff.user.image ?? undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(`${application.staff.firstName} ${application.staff.lastName}`)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">
              {application.staff.firstName} {application.staff.lastName}
            </p>
            <p className="text-sm text-muted-foreground">
              {application.staff.employeeId} · {application.staff.department ?? "N/A"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Leave Type</p>
            <p className="font-medium">{leaveTypeLabels[application.type]}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge className={statusColors[application.status]}>
              {application.status}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Start Date</p>
            <p className="font-medium">{formatDate(application.startDate)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">End Date</p>
            <p className="font-medium">{formatDate(application.endDate)}</p>
          </div>
          <div className="col-span-2">
            <p className="text-sm text-muted-foreground">Duration</p>
            <p className="font-medium">{days} day{days > 1 ? "s" : ""}</p>
          </div>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Reason</p>
          <p className="text-sm mt-1">{application.reason}</p>
        </div>

        {application.reviewedAt && (
          <div>
            <p className="text-sm text-muted-foreground">Reviewed On</p>
            <p className="text-sm">{formatDate(application.reviewedAt)}</p>
          </div>
        )}
      </div>
    </DialogContent>
  );
}

export function LeaveClient({
  applications: initialApplications,
  staffList,
  canManage,
  isTeacher,
  currentStaffId,
}: LeaveClientProps) {
  const [applications, setApplications] = useState(initialApplications);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [addOpen, setAddOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<LeaveApplication | null>(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (typeFilter !== "ALL") params.append("type", typeFilter);

      const res = await fetch(`/api/hr/leave?${params}`);
      const json = await res.json();
      setApplications(json);
    } catch {
      toast.error("Failed to load leave applications");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleStatusUpdate = async (id: string, status: "APPROVED" | "REJECTED") => {
    try {
      const res = await fetch(`/api/hr/leave/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to update status");
      }

      toast.success(`Leave application ${status.toLowerCase()}`);
      fetchApplications();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update status");
    }
  };

  const filteredApplications = applications.filter((app) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    const staff = app.staff;
    if (!staff) return false;
    return (
      staff.firstName.toLowerCase().includes(searchLower) ||
      staff.lastName.toLowerCase().includes(searchLower) ||
      staff.employeeId?.toLowerCase().includes(searchLower)
    );
  });

  const pendingCount = applications.filter((a) => a.status === "PENDING").length;
  const approvedCount = applications.filter((a) => a.status === "APPROVED").length;
  const rejectedCount = applications.filter((a) => a.status === "REJECTED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Leave Management
          </h1>
          <p className="text-muted-foreground">
            {isTeacher ? "Your leave applications" : "Manage staff leave applications"}
          </p>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Apply for Leave
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>New Leave Application</DialogTitle>
            </DialogHeader>
            <AddLeaveForm
              staffList={staffList}
              currentStaffId={currentStaffId}
              isTeacher={isTeacher}
              onSuccess={() => {
                setAddOpen(false);
                fetchApplications();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
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
            <p className="text-3xl font-bold text-green-600">{approvedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{rejectedCount}</p>
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Leave Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                {Object.entries(leaveTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Leave Applications</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Applied On</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredApplications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No leave applications found
                  </TableCell>
                </TableRow>
              ) : (
                filteredApplications.map((app) => {
                  const startDate = new Date(app.startDate);
                  const endDate = new Date(app.endDate);
                  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                  return (
                    <TableRow key={app.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={app.staff.user.image ?? undefined} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {getInitials(`${app.staff.firstName} ${app.staff.lastName}`)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">
                              {app.staff.firstName} {app.staff.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {app.staff.employeeId}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{leaveTypeLabels[app.type]}</TableCell>
                      <TableCell className="text-sm">
                        {formatDate(app.startDate)} - {formatDate(app.endDate)}
                        <span className="text-muted-foreground ml-1">({days}d)</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[app.status]}>
                          {app.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(app.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            </DialogTrigger>
                            <LeaveDetailsDialog application={app} />
                          </Dialog>
                          {canManage && app.status === "PENDING" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-green-600 hover:text-green-700"
                                onClick={() => handleStatusUpdate(app.id, "APPROVED")}
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700"
                                onClick={() => handleStatusUpdate(app.id, "REJECTED")}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}