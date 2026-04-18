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
import { toast } from "sonner";
import {
  Plus,
  BookOpen,
  Loader2,
  Pencil,
  Trash2,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  type: "CORE" | "ELECTIVE";
  creditHours: number;
  createdAt: string;
  _count: { teachingAssignments: number; timetables: number };
}

interface SubjectsClientProps {
  subjects: Subject[];
  canManage: boolean;
}

const subjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  description: z.string().optional(),
  type: z.enum(["CORE", "ELECTIVE"]),
  creditHours: z.number().int().min(1),
});

type SubjectFormData = z.infer<typeof subjectSchema>;

function InfoItem({ label, value, icon }: { label: string; value: string | number | null | undefined; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      {icon && <span className="text-muted-foreground mt-0.5">{icon}</span>}
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value ?? "N/A"}</p>
      </div>
    </div>
  );
}

function AddSubjectForm({ onSuccess }: { onSuccess: () => void }) {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
    defaultValues: { type: "CORE", creditHours: 1 },
  });

  const onSubmit = async (data: SubjectFormData) => {
    try {
      const res = await fetch("/api/academic/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create subject");
      }

      toast.success("Subject created successfully");
      reset();
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create subject");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Subject Name *</Label>
          <Input id="name" placeholder="e.g. Mathematics" {...register("name")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="code">Subject Code *</Label>
          <Input id="code" placeholder="e.g. MATH101" {...register("code")} />
          {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" placeholder="Optional description" {...register("description")} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select defaultValue="CORE" onValueChange={(v) => setValue("type", v as "CORE" | "ELECTIVE")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="CORE">Core</SelectItem>
              <SelectItem value="ELECTIVE">Elective</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="creditHours">Credit Hours</Label>
          <Input id="creditHours" type="number" min={1} {...register("creditHours", { valueAsNumber: true })} />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : "Create Subject"}
        </Button>
      </div>
    </form>
  );
}

function EditSubjectForm({ subject, onSuccess, onClose }: { subject: Subject; onSuccess: () => void; onClose: () => void }) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: subject.name,
      code: subject.code,
      description: subject.description ?? "",
      type: subject.type,
      creditHours: subject.creditHours,
    },
  });

  const onSubmit = async (data: SubjectFormData) => {
    try {
      const res = await fetch(`/api/academic/subjects/${subject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to update subject");
      }

      toast.success("Subject updated successfully");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update subject");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-name">Subject Name *</Label>
          <Input id="edit-name" {...register("name")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-code">Subject Code *</Label>
          <Input id="edit-code" {...register("code")} />
          {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-description">Description</Label>
        <Input id="edit-description" {...register("description")} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select defaultValue={subject.type} onValueChange={(v) => setValue("type", v as "CORE" | "ELECTIVE")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="CORE">Core</SelectItem>
              <SelectItem value="ELECTIVE">Elective</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-creditHours">Credit Hours</Label>
          <Input id="edit-creditHours" type="number" min={1} {...register("creditHours", { valueAsNumber: true })} />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</> : "Update"}
        </Button>
      </div>
    </form>
  );
}

export function SubjectsClient({
  subjects: initialSubjects,
  canManage,
}: SubjectsClientProps) {
  const [subjects, setSubjects] = useState(initialSubjects);
  const [addOpen, setAddOpen] = useState(false);
  const [viewSubject, setViewSubject] = useState<Subject | null>(null);
  const [editSubject, setEditSubject] = useState<Subject | null>(null);
  const [deleteSubject, setDeleteSubject] = useState<Subject | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const refreshData = async () => {
    try {
      const res = await fetch("/api/academic/subjects");
      if (res.ok) {
        const data = await res.json();
        setSubjects(data.map((s: Record<string, unknown>) => {
          const count = s._count as Record<string, unknown> | undefined;
          return {
            ...s,
            _count: {
              teachingAssignments: (count?.teachingAssignments ?? count?.TeachingAssignment ?? 0) as number,
              timetables: (count?.timetables ?? count?.Timetable ?? 0) as number,
            },
          };
        }));
      }
    } catch {
      toast.error("Failed to refresh data");
    }
  };

  const handleDelete = async () => {
    if (!deleteSubject) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/academic/subjects/${deleteSubject.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to delete subject");
      }
      toast.success("Subject deleted successfully");
      setDeleteSubject(null);
      refreshData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete subject");
    } finally {
      setDeleting(false);
    }
  };

  const filteredSubjects = subjects.filter((s) => {
    const matchesSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      (s.description ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "ALL" || s.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const coreSubjects = subjects.filter((s) => s.type === "CORE");
  const electiveSubjects = subjects.filter((s) => s.type === "ELECTIVE");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Subjects
          </h1>
          <p className="text-muted-foreground">
            {subjects.length} subjects · {coreSubjects.length} core · {electiveSubjects.length} elective
          </p>
        </div>

        {canManage && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Subject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Subject</DialogTitle>
              </DialogHeader>
              <AddSubjectForm onSuccess={() => { setAddOpen(false); refreshData(); }} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Subjects</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{subjects.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Core Subjects</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{coreSubjects.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Elective Subjects</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">{electiveSubjects.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search subjects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="CORE">Core</SelectItem>
            <SelectItem value="ELECTIVE">Elective</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Subjects Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Subjects</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Teachers</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No subjects found
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubjects.map((subject) => (
                  <TableRow
                    key={subject.id}
                    className="cursor-pointer"
                    onClick={() => setViewSubject(subject)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{subject.name}</p>
                        {subject.description && (
                          <p className="text-xs text-muted-foreground">{subject.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{subject.code}</TableCell>
                    <TableCell>
                      <Badge
                        variant={subject.type === "CORE" ? "default" : "secondary"}
                        className={subject.type === "CORE" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}
                      >
                        {subject.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{subject.creditHours}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{subject._count.teachingAssignments}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {canManage && (
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditSubject(subject)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteSubject(subject)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Subject Dialog */}
      <Dialog open={!!viewSubject} onOpenChange={() => setViewSubject(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Subject Details</DialogTitle>
          </DialogHeader>
          {viewSubject && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoItem label="Name" value={viewSubject.name} icon={<BookOpen className="h-4 w-4" />} />
                <InfoItem label="Code" value={viewSubject.code} />
                <InfoItem label="Type" value={viewSubject.type} />
                <InfoItem label="Credit Hours" value={viewSubject.creditHours} />
                <InfoItem label="Teachers" value={`${viewSubject._count.teachingAssignments}`} />
                <InfoItem label="Timetable Entries" value={`${viewSubject._count.timetables}`} />
              </div>
              {viewSubject.description && (
                <div>
                  <p className="text-xs text-muted-foreground">Description</p>
                  <p className="text-sm">{viewSubject.description}</p>
                </div>
              )}
              {canManage && (
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => { setViewSubject(null); setEditSubject(viewSubject); }}>
                    <Pencil className="w-4 h-4 mr-1" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => { setViewSubject(null); setDeleteSubject(viewSubject); }}>
                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Subject Dialog */}
      <Dialog open={!!editSubject} onOpenChange={() => setEditSubject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subject</DialogTitle>
          </DialogHeader>
          {editSubject && (
            <EditSubjectForm subject={editSubject} onSuccess={refreshData} onClose={() => setEditSubject(null)} />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Subject Dialog */}
      <AlertDialog open={!!deleteSubject} onOpenChange={() => setDeleteSubject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subject</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>&quot;{deleteSubject?.name}&quot;</strong> ({deleteSubject?.code})?
              Subjects with teaching assignments or timetables cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}