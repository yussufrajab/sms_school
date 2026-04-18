"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
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
  CalendarDays,
  Loader2,
  Pencil,
  Trash2,
  BookOpen,
} from "lucide-react";

interface AcademicYear {
  id: string;
  name: string;
  isCurrent: boolean;
}

interface Term {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  academicYearId: string;
  academicYear: AcademicYear;
  createdAt: string;
  _count: { exams: number };
}

interface TermsClientProps {
  terms: Term[];
  academicYears: AcademicYear[];
  canManage: boolean;
}

const termSchema = z.object({
  name: z.string().min(1, "Name is required"),
  academicYearId: z.string().min(1, "Academic year is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

type TermFormData = z.infer<typeof termSchema>;

function AddTermForm({
  academicYears,
  onSuccess,
}: {
  academicYears: AcademicYear[];
  onSuccess: () => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TermFormData>({
    resolver: zodResolver(termSchema),
    defaultValues: {
      academicYearId: academicYears.find((y) => y.isCurrent)?.id || "",
    },
  });

  const onSubmit = async (data: TermFormData) => {
    try {
      const res = await fetch("/api/academic/terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create term");
      }

      toast.success("Term created successfully");
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create term"
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>Academic Year *</Label>
        <Select
          defaultValue={academicYears.find((y) => y.isCurrent)?.id || ""}
          onValueChange={(v) => setValue("academicYearId", v)}
        >
          <SelectTrigger>
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
        {errors.academicYearId && (
          <p className="text-xs text-destructive">{errors.academicYearId.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Term Name *</Label>
        <Input id="name" placeholder="e.g. First Term" {...register("name")} />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date *</Label>
          <Input id="startDate" type="date" {...register("startDate")} />
          {errors.startDate && (
            <p className="text-xs text-destructive">{errors.startDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">End Date *</Label>
          <Input id="endDate" type="date" {...register("endDate")} />
          {errors.endDate && (
            <p className="text-xs text-destructive">{errors.endDate.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Term"
          )}
        </Button>
      </div>
    </form>
  );
}

function EditTermForm({
  term,
  academicYears,
  onSuccess,
  onClose,
}: {
  term: Term;
  academicYears: AcademicYear[];
  onSuccess: () => void;
  onClose: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TermFormData>({
    resolver: zodResolver(termSchema),
    defaultValues: {
      name: term.name,
      academicYearId: term.academicYearId,
      startDate: term.startDate.split("T")[0],
      endDate: term.endDate.split("T")[0],
    },
  });

  const onSubmit = async (data: TermFormData) => {
    try {
      const res = await fetch("/api/academic/terms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: term.id, ...data }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to update term");
      }

      toast.success("Term updated successfully");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update term"
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>Academic Year</Label>
        <Input value={term.academicYear.name} disabled />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-name">Term Name *</Label>
        <Input id="edit-name" {...register("name")} />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-startDate">Start Date *</Label>
          <Input id="edit-startDate" type="date" {...register("startDate")} />
          {errors.startDate && (
            <p className="text-xs text-destructive">{errors.startDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-endDate">End Date *</Label>
          <Input id="edit-endDate" type="date" {...register("endDate")} />
          {errors.endDate && (
            <p className="text-xs text-destructive">{errors.endDate.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            "Update"
          )}
        </Button>
      </div>
    </form>
  );
}

export function TermsClient({
  terms: initialTerms,
  academicYears,
  canManage,
}: TermsClientProps) {
  const [terms, setTerms] = useState(initialTerms);
  const [addOpen, setAddOpen] = useState(false);
  const [editTerm, setEditTerm] = useState<Term | null>(null);
  const [deleteTerm, setDeleteTerm] = useState<Term | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>(
    academicYears.find((y) => y.isCurrent)?.id || "ALL"
  );

  const refreshData = async () => {
    try {
      const res = await fetch(
        `/api/academic/terms${selectedYear && selectedYear !== "ALL" ? `?academicYearId=${selectedYear}` : ""}`
      );
      if (res.ok) {
        const data = await res.json();
        setTerms(data);
      }
    } catch {
      toast.error("Failed to refresh data");
    }
  };

  const handleDelete = async () => {
    if (!deleteTerm) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/academic/terms?id=${deleteTerm.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to delete term");
      }

      toast.success("Term deleted successfully");
      setDeleteTerm(null);
      refreshData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete term"
      );
    } finally {
      setDeleting(false);
    }
  };

  const filteredTerms = selectedYear && selectedYear !== "ALL"
    ? terms.filter((t) => t.academicYearId === selectedYear)
    : terms;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Terms
          </h1>
          <p className="text-muted-foreground">
            {terms.length} terms across {academicYears.length} academic years
          </p>
        </div>

        {canManage && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Term
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Term</DialogTitle>
              </DialogHeader>
              <AddTermForm
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

      {/* Filter */}
      <div className="flex gap-4">
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by academic year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Years</SelectItem>
            {academicYears.map((year) => (
              <SelectItem key={year.id} value={year.id}>
                {year.name}
                {year.isCurrent && " (Current)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{terms.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Year Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">
              {terms.filter((t) => t.academicYear.isCurrent).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Exams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {terms.reduce((sum, t) => sum + t._count.exams, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Terms Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {selectedYear ? "Terms for Selected Year" : "All Terms"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Term</TableHead>
                <TableHead>Academic Year</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Exams</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTerms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No terms found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTerms.map((term) => (
                  <TableRow key={term.id}>
                    <TableCell className="font-medium">{term.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        {term.academicYear.name}
                        {term.academicYear.isCurrent && (
                          <Badge variant="secondary" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(term.startDate), "MMM d, yyyy")}</TableCell>
                    <TableCell>{format(new Date(term.endDate), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{term._count.exams} exams</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {canManage && (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditTerm(term)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteTerm(term)}
                            disabled={term._count.exams > 0}
                          >
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

      {/* Edit Dialog */}
      <Dialog open={!!editTerm} onOpenChange={() => setEditTerm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Term</DialogTitle>
          </DialogHeader>
          {editTerm && (
            <EditTermForm
              term={editTerm}
              academicYears={academicYears}
              onSuccess={refreshData}
              onClose={() => setEditTerm(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTerm} onOpenChange={() => setDeleteTerm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Term</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTerm?.name}&quot;? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
