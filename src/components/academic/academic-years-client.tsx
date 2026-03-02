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
  Calendar,
  Loader2,
  Pencil,
  Trash2,
  Star,
  Check,
} from "lucide-react";

interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  createdAt: string;
  _count: { terms: number; exams: number };
}

interface AcademicYearsClientProps {
  years: AcademicYear[];
  canManage: boolean;
}

const yearSchema = z.object({
  name: z.string().min(1, "Name is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  isCurrent: z.boolean(),
});

type YearFormData = z.infer<typeof yearSchema>;

function AddYearForm({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<YearFormData>({
    resolver: zodResolver(yearSchema),
    defaultValues: { isCurrent: false },
  });

  const onSubmit = async (data: YearFormData) => {
    try {
      const res = await fetch("/api/academic/years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create academic year");
      }

      toast.success("Academic year created successfully");
      reset();
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create academic year"
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Academic Year Name *</Label>
        <Input
          id="name"
          placeholder="e.g. 2024-2025"
          {...register("name")}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date *</Label>
          <Input
            id="startDate"
            type="date"
            {...register("startDate")}
          />
          {errors.startDate && (
            <p className="text-xs text-destructive">{errors.startDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">End Date *</Label>
          <Input
            id="endDate"
            type="date"
            {...register("endDate")}
          />
          {errors.endDate && (
            <p className="text-xs text-destructive">{errors.endDate.message}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isCurrent"
          className="h-4 w-4"
          onChange={(e) => setValue("isCurrent", e.target.checked)}
        />
        <Label htmlFor="isCurrent" className="font-normal">
          Set as current academic year
        </Label>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Academic Year"
          )}
        </Button>
      </div>
    </form>
  );
}

function EditYearForm({
  year,
  onSuccess,
  onClose,
}: {
  year: AcademicYear;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<YearFormData>({
    resolver: zodResolver(yearSchema),
    defaultValues: {
      name: year.name,
      startDate: year.startDate.split("T")[0],
      endDate: year.endDate.split("T")[0],
      isCurrent: year.isCurrent,
    },
  });

  const onSubmit = async (data: YearFormData) => {
    try {
      const res = await fetch("/api/academic/years", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: year.id, ...data }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to update academic year");
      }

      toast.success("Academic year updated successfully");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update academic year"
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-name">Academic Year Name *</Label>
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

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="edit-isCurrent"
          className="h-4 w-4"
          defaultChecked={year.isCurrent}
          onChange={(e) => setValue("isCurrent", e.target.checked)}
        />
        <Label htmlFor="edit-isCurrent" className="font-normal">
          Set as current academic year
        </Label>
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

export function AcademicYearsClient({
  years: initialYears,
  canManage,
}: AcademicYearsClientProps) {
  const [years, setYears] = useState(initialYears);
  const [addOpen, setAddOpen] = useState(false);
  const [editYear, setEditYear] = useState<AcademicYear | null>(null);
  const [deleteYear, setDeleteYear] = useState<AcademicYear | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refreshData = async () => {
    try {
      const res = await fetch("/api/academic/years");
      if (res.ok) {
        const data = await res.json();
        setYears(data);
      }
    } catch {
      toast.error("Failed to refresh data");
    }
  };

  const handleSetCurrent = async (year: AcademicYear) => {
    try {
      const res = await fetch("/api/academic/years", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: year.id, isCurrent: true }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to set current year");
      }

      toast.success("Current academic year updated");
      refreshData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to set current year"
      );
    }
  };

  const handleDelete = async () => {
    if (!deleteYear) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/academic/years?id=${deleteYear.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to delete academic year");
      }

      toast.success("Academic year deleted successfully");
      setDeleteYear(null);
      refreshData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete academic year"
      );
    } finally {
      setDeleting(false);
    }
  };

  const currentYear = years.find((y) => y.isCurrent);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Academic Years
          </h1>
          <p className="text-muted-foreground">
            {years.length} academic years
            {currentYear && ` · Current: ${currentYear.name}`}
          </p>
        </div>

        {canManage && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Academic Year
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Academic Year</DialogTitle>
              </DialogHeader>
              <AddYearForm
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Academic Years
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{years.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Year
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">
              {currentYear?.name || "Not Set"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {years.reduce((sum, y) => sum + y._count.terms, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Years Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Academic Years</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Year</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Terms</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {years.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No academic years created yet
                  </TableCell>
                </TableRow>
              ) : (
                years.map((year) => (
                  <TableRow key={year.id}>
                    <TableCell className="font-medium">{year.name}</TableCell>
                    <TableCell>{format(new Date(year.startDate), "MMM d, yyyy")}</TableCell>
                    <TableCell>{format(new Date(year.endDate), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{year._count.terms} terms</Badge>
                    </TableCell>
                    <TableCell>
                      {year.isCurrent ? (
                        <Badge className="bg-green-100 text-green-800">
                          <Star className="w-3 h-3 mr-1" />
                          Current
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {canManage && (
                        <div className="flex justify-end gap-1">
                          {!year.isCurrent && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleSetCurrent(year)}
                              title="Set as current"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditYear(year)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteYear(year)}
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
      <Dialog open={!!editYear} onOpenChange={() => setEditYear(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Academic Year</DialogTitle>
          </DialogHeader>
          {editYear && (
            <EditYearForm
              year={editYear}
              onSuccess={refreshData}
              onClose={() => setEditYear(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteYear} onOpenChange={() => setDeleteYear(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Academic Year</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteYear?.name}&quot;? This action
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
