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
import { toast } from "sonner";
import { Plus, BookOpen, Loader2, Pencil, Trash2 } from "lucide-react";

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

function AddSubjectForm({
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
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CORE">Core</SelectItem>
              <SelectItem value="ELECTIVE">Elective</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="creditHours">Credit Hours</Label>
          <Input
            id="creditHours"
            type="number"
            min={1}
            {...register("creditHours", { valueAsNumber: true })}
          />
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
            "Create Subject"
          )}
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

  const refreshData = async () => {
    try {
      const res = await fetch("/api/academic/subjects");
      if (res.ok) {
        const data = await res.json();
        setSubjects(data);
      }
    } catch {
      toast.error("Failed to refresh data");
    }
  };

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
              <AddSubjectForm
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
              {subjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No subjects created yet
                  </TableCell>
                </TableRow>
              ) : (
                subjects.map((subject) => (
                  <TableRow key={subject.id}>
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
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
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
    </div>
  );
}
