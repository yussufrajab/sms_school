"use client";

import { useState, useEffect, useCallback } from "react";
import { UserRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Droplets,
  Flag,
  AlertTriangle,
  Users,
} from "lucide-react";
import { formatDate, getInitials } from "@/lib/utils";
import { AddStudentForm } from "./add-student-form";

interface Section {
  id: string;
  name: string;
  class: { id: string; name: string };
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  studentId: string;
  gender: string;
  status: string;
  dateOfBirth?: string;
  nationality?: string;
  bloodGroup?: string;
  address?: string;
  phone?: string;
  emergencyContact?: string;
  createdAt: string;
  section?: { name: string; class: { name: string } } | null;
  user?: { email: string };
}

interface StudentsClientProps {
  sections: Section[];
  userRole: UserRole;
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  GRADUATED: "bg-blue-100 text-blue-800",
  TRANSFERRED: "bg-yellow-100 text-yellow-800",
  SUSPENDED: "bg-orange-100 text-orange-800",
  EXPELLED: "bg-red-100 text-red-800",
};

export function StudentsClient({ sections, userRole }: StudentsClientProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sectionFilter, setSectionFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [viewStudent, setViewStudent] = useState<Student | null>(null);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Student | null>(null);
  const [saving, setSaving] = useState(false);

  const canManage = ["SUPER_ADMIN", "SCHOOL_ADMIN", "RECEPTIONIST"].includes(
    userRole
  );

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(search ? { search } : {}),
        ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
        ...(sectionFilter !== "ALL" ? { sectionId: sectionFilter } : {}),
      });

      const res = await fetch(`/api/students?${params}`);
      const json = await res.json();
      setStudents(json.data ?? []);
      setTotalPages(json.pagination?.totalPages ?? 1);
      setTotal(json.pagination?.total ?? 0);
    } catch {
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, sectionFilter]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleDelete = async (student: Student) => {
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success(`${student.firstName} ${student.lastName} deleted`);
      fetchStudents();
    } catch {
      toast.error("Failed to delete student");
    }
  };

  const handleEditSave = async () => {
    if (!editStudent) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/students/${editStudent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editStudent.firstName,
          lastName: editStudent.lastName,
          gender: editStudent.gender,
          status: editStudent.status,
          phone: editStudent.phone || undefined,
          address: editStudent.address || undefined,
          emergencyContact: editStudent.emergencyContact || undefined,
          bloodGroup: editStudent.bloodGroup || undefined,
          nationality: editStudent.nationality || undefined,
          sectionId: editStudent.section?.name
            ? sections.find(
                (s) =>
                  s.class.name === editStudent.section?.class?.name &&
                  s.name === editStudent.section?.name
              )?.id
            : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to update");
      }
      toast.success("Student updated");
      setEditStudent(null);
      fetchStudents();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update student"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Students</h1>
          <p className="text-muted-foreground">{total} students total</p>
        </div>
        {canManage && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Student
            </Button>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Student</DialogTitle>
              </DialogHeader>
              <AddStudentForm
                sections={sections}
                onSuccess={() => {
                  setAddOpen(false);
                  fetchStudents();
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or student ID..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="GRADUATED">Graduated</SelectItem>
                <SelectItem value="TRANSFERRED">Transferred</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="EXPELLED">Expelled</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={sectionFilter}
              onValueChange={(v) => {
                setSectionFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Class/Section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Classes</SelectItem>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.class.name} - {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Student List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Enrolled</TableHead>
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
              ) : students.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-12 text-muted-foreground"
                  >
                    No students found
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student) => (
                  <TableRow
                    key={student.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => setViewStudent(student)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {getInitials(
                              `${student.firstName} ${student.lastName}`
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {student.user?.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {student.studentId}
                    </TableCell>
                    <TableCell className="text-sm">
                      {student.section
                        ? `${student.section.class.name} - ${student.section.name}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm capitalize">
                      {student.gender?.toLowerCase()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-xs ${statusColors[student.status] ?? ""}`}
                        variant="outline"
                      >
                        {student.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(student.createdAt)}
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
                          onClick={() => setViewStudent(student)}
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
                              onClick={() => setEditStudent(student)}
                              title="Edit student"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirm(student)}
                              title="Delete student"
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

      {/* View Student Dialog */}
      <Dialog
        open={!!viewStudent}
        onOpenChange={(open) => !open && setViewStudent(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(
                    `${viewStudent?.firstName ?? ""} ${viewStudent?.lastName ?? ""}`
                  )}
                </AvatarFallback>
              </Avatar>
              <div>
                <span>
                  {viewStudent?.firstName} {viewStudent?.lastName}
                </span>
                <p className="text-sm font-normal text-muted-foreground">
                  {viewStudent?.studentId}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
          {viewStudent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoItem
                  icon={Mail}
                  label="Email"
                  value={viewStudent.user?.email}
                />
                <InfoItem
                  icon={User}
                  label="Gender"
                  value={viewStudent.gender?.toLowerCase()}
                  capitalize
                />
                <InfoItem
                  icon={Calendar}
                  label="Date of Birth"
                  value={
                    viewStudent.dateOfBirth
                      ? new Date(viewStudent.dateOfBirth).toLocaleDateString()
                      : undefined
                  }
                />
                <InfoItem
                  icon={Flag}
                  label="Nationality"
                  value={viewStudent.nationality}
                />
                <InfoItem
                  icon={Droplets}
                  label="Blood Group"
                  value={viewStudent.bloodGroup}
                />
                <InfoItem
                  icon={Users}
                  label="Class"
                  value={
                    viewStudent.section
                      ? `${viewStudent.section.class.name} - ${viewStudent.section.name}`
                      : undefined
                  }
                />
                <InfoItem
                  icon={Phone}
                  label="Phone"
                  value={viewStudent.phone}
                />
                <InfoItem
                  icon={AlertTriangle}
                  label="Emergency Contact"
                  value={viewStudent.emergencyContact}
                />
                <InfoItem
                  icon={MapPin}
                  label="Address"
                  value={viewStudent.address}
                  className="col-span-2"
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                <Badge
                  className={`${statusColors[viewStudent.status] ?? ""}`}
                  variant="outline"
                >
                  {viewStudent.status}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  Enrolled {formatDate(viewStudent.createdAt)}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog
        open={!!editStudent}
        onOpenChange={(open) => !open && setEditStudent(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit {editStudent?.firstName} {editStudent?.lastName}
            </DialogTitle>
          </DialogHeader>
          {editStudent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    value={editStudent.firstName}
                    onChange={(e) =>
                      setEditStudent({
                        ...editStudent,
                        firstName: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    value={editStudent.lastName}
                    onChange={(e) =>
                      setEditStudent({
                        ...editStudent,
                        lastName: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select
                    value={editStudent.gender}
                    onValueChange={(v) =>
                      setEditStudent({ ...editStudent, gender: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editStudent.status}
                    onValueChange={(v) =>
                      setEditStudent({ ...editStudent, status: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="GRADUATED">Graduated</SelectItem>
                      <SelectItem value="TRANSFERRED">Transferred</SelectItem>
                      <SelectItem value="SUSPENDED">Suspended</SelectItem>
                      <SelectItem value="EXPELLED">Expelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nationality</Label>
                  <Input
                    value={editStudent.nationality ?? ""}
                    onChange={(e) =>
                      setEditStudent({
                        ...editStudent,
                        nationality: e.target.value || undefined,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Blood Group</Label>
                  <Select
                    value={editStudent.bloodGroup ?? "NONE"}
                    onValueChange={(v) =>
                      setEditStudent({
                        ...editStudent,
                        bloodGroup: v === "NONE" ? undefined : v,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Not specified</SelectItem>
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                        (bg) => (
                          <SelectItem key={bg} value={bg}>
                            {bg}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={editStudent.phone ?? ""}
                    onChange={(e) =>
                      setEditStudent({
                        ...editStudent,
                        phone: e.target.value || undefined,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Emergency Contact</Label>
                  <Input
                    value={editStudent.emergencyContact ?? ""}
                    onChange={(e) =>
                      setEditStudent({
                        ...editStudent,
                        emergencyContact: e.target.value || undefined,
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Class / Section</Label>
                <Select
                  value={
                    editStudent.section
                      ? sections.find(
                          (s) =>
                            s.class.name ===
                              editStudent.section?.class?.name &&
                            s.name === editStudent.section?.name
                        )?.id ?? "NONE"
                      : "NONE"
                  }
                  onValueChange={(v) => {
                    if (v === "NONE") {
                      setEditStudent({ ...editStudent, section: null });
                    } else {
                      const sec = sections.find((s) => s.id === v);
                      if (sec) {
                        setEditStudent({
                          ...editStudent,
                          section: {
                            name: sec.name,
                            class: { name: sec.class.name },
                          },
                        });
                      }
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class and section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Not assigned</SelectItem>
                    {sections.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.class.name} - {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Textarea
                  value={editStudent.address ?? ""}
                  rows={2}
                  onChange={(e) =>
                    setEditStudent({
                      ...editStudent,
                      address: e.target.value || undefined,
                    })
                  }
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setEditStudent(null)}
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
            <AlertDialogTitle>Delete student?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete {deleteConfirm?.firstName}{" "}
              {deleteConfirm?.lastName} ({deleteConfirm?.studentId}). This action
              cannot be undone.
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
    <div
      className={`flex items-start gap-2 text-sm ${className ?? ""}`}
    >
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className={capitalize ? "capitalize" : ""}>{value || "—"}</p>
      </div>
    </div>
  );
}