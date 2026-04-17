"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";
import {
  Plus,
  GraduationCap,
  Loader2,
  Trash2,
  User,
  BookOpen,
  Users,
  Search,
} from "lucide-react";

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  department?: string | null;
  designation?: string | null;
  user?: { email: string; image?: string | null } | null;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  type: string;
}

interface Section {
  id: string;
  name: string;
  class: { id: string; name: string; level: number };
}

interface AcademicYear {
  id: string;
  name: string;
  isCurrent: boolean;
}

interface TeachingAssignment {
  id: string;
  staffId: string;
  subjectId: string;
  sectionId: string;
  academicYearId?: string | null;
  createdAt: string;
  staff: Staff;
  subject: Subject;
  section: Section;
}

interface TeachingAssignmentsClientProps {
  assignments: TeachingAssignment[];
  staff: Staff[];
  subjects: Subject[];
  sections: Section[];
  academicYears: AcademicYear[];
  canManage: boolean;
}

const assignmentSchema = z.object({
  staffId: z.string().min(1, "Teacher is required"),
  subjectId: z.string().min(1, "Subject is required"),
  sectionId: z.string().min(1, "Section is required"),
  academicYearId: z.string().optional(),
});

type AssignmentFormData = z.infer<typeof assignmentSchema>;

function AddAssignmentForm({
  staff,
  subjects,
  sections,
  academicYears,
  onSuccess,
}: {
  staff: Staff[];
  subjects: Subject[];
  sections: Section[];
  academicYears: AcademicYear[];
  onSuccess: () => void;
}) {
  const {
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      academicYearId: academicYears.find((y) => y.isCurrent)?.id || "",
    },
  });

  const onSubmit = async (data: AssignmentFormData) => {
    try {
      const res = await fetch("/api/academic/teaching-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create assignment");
      }

      toast.success("Teaching assignment created successfully");
      reset();
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create assignment"
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>Teacher *</Label>
        <Select onValueChange={(v) => setValue("staffId", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select teacher" />
          </SelectTrigger>
          <SelectContent>
            {staff.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.firstName} {s.lastName} ({s.employeeId})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.staffId && (
          <p className="text-xs text-destructive">{errors.staffId.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Subject *</Label>
        <Select onValueChange={(v) => setValue("subjectId", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select subject" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name} ({s.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.subjectId && (
          <p className="text-xs text-destructive">{errors.subjectId.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Section *</Label>
        <Select onValueChange={(v) => setValue("sectionId", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select section" />
          </SelectTrigger>
          <SelectContent>
            {sections.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.class.name} - {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.sectionId && (
          <p className="text-xs text-destructive">{errors.sectionId.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Academic Year (Optional)</Label>
        <Select
          defaultValue={academicYears.find((y) => y.isCurrent)?.id || ""}
          onValueChange={(v) => setValue("academicYearId", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select academic year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">None</SelectItem>
            {academicYears.map((y) => (
              <SelectItem key={y.id} value={y.id}>
                {y.name}
                {y.isCurrent && " (Current)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Assignment"
          )}
        </Button>
      </div>
    </form>
  );
}

export function TeachingAssignmentsClient({
  assignments: initialAssignments,
  staff,
  subjects,
  sections,
  academicYears,
  canManage,
}: TeachingAssignmentsClientProps) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteAssignment, setDeleteAssignment] = useState<TeachingAssignment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStaff, setFilterStaff] = useState("");
  const [filterSubject, setFilterSubject] = useState("");

  const refreshData = async () => {
    try {
      const res = await fetch("/api/academic/teaching-assignments");
      if (res.ok) {
        const data = await res.json();
        setAssignments(data);
      }
    } catch {
      toast.error("Failed to refresh data");
    }
  };

  const handleDelete = async () => {
    if (!deleteAssignment) return;

    setDeleting(true);
    try {
      const res = await fetch(
        `/api/academic/teaching-assignments?id=${deleteAssignment.id}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to delete assignment");
      }

      toast.success("Teaching assignment deleted successfully");
      setDeleteAssignment(null);
      refreshData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete assignment"
      );
    } finally {
      setDeleting(false);
    }
  };

  // Filter assignments
  const filteredAssignments = assignments.filter((a) => {
    const matchesSearch =
      searchTerm === "" ||
      `${a.staff?.firstName ?? ""} ${a.staff?.lastName ?? ""}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.subject?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${a.section?.class?.name ?? ""} - ${a.section?.name ?? ""}`.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStaff = filterStaff === "" || a.staffId === filterStaff;
    const matchesSubject = filterSubject === "" || a.subjectId === filterSubject;

    return matchesSearch && matchesStaff && matchesSubject;
  });

  // Group assignments by teacher
  const assignmentsByTeacher = assignments.reduce((acc, a) => {
    const key = a.staffId;
    if (!acc[key]) {
      acc[key] = {
        staff: a.staff,
        assignments: [],
      };
    }
    acc[key].assignments.push(a);
    return acc;
  }, {} as Record<string, { staff: Staff; assignments: TeachingAssignment[] }>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            Teaching Assignments
          </h1>
          <p className="text-muted-foreground">
            {assignments.length} assignments · {Object.keys(assignmentsByTeacher).length} teachers
          </p>
        </div>

        {canManage && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Teaching Assignment</DialogTitle>
              </DialogHeader>
              <AddAssignmentForm
                staff={staff}
                subjects={subjects}
                sections={sections}
                academicYears={academicYears}
                onSuccess={() => {
                  setAddOpen(false);
                  refreshData();
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{assignments.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Teachers Assigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              {Object.keys(assignmentsByTeacher).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Subjects Covered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {new Set(assignments.map((a) => a.subjectId)).size}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sections Covered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">
              {new Set(assignments.map((a) => a.sectionId)).size}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by teacher, subject, or class..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStaff} onValueChange={setFilterStaff}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by teacher" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Teachers</SelectItem>
            {staff.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.firstName} {s.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Subjects</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Assignments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Teaching Assignments</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Teacher</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Class - Section</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No teaching assignments found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {assignment.staff.firstName} {assignment.staff.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {assignment.staff.employeeId}
                            {assignment.staff.department && ` · ${assignment.staff.department}`}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{assignment.subject.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {assignment.subject.code}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{assignment.section.class.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Section: {assignment.section.name}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteAssignment(assignment)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteAssignment} onOpenChange={() => setDeleteAssignment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Teaching Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this assignment?{" "}
              <strong>
                {deleteAssignment?.staff.firstName} {deleteAssignment?.staff.lastName}
              </strong>{" "}
              will no longer be assigned to teach{" "}
              <strong>{deleteAssignment?.subject.name}</strong> for{" "}
              <strong>
                {deleteAssignment?.section.class.name} - {deleteAssignment?.section.name}
              </strong>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
