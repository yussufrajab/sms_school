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
import { Plus, Building2, Users, Loader2, Pencil, Trash2 } from "lucide-react";

// Types
interface ClassItem {
  id: string;
  name: string;
  level: number;
  description?: string | null;
  createdAt: string;
  sections: Array<{
    id: string;
    name: string;
    _count: { students: number };
  }>;
  _count: { sections: number };
}

interface Section {
  id: string;
  name: string;
  maxCapacity: number;
  createdAt: string;
  class: { id: string; name: string; level: number };
  _count: { students: number };
}

interface ClassesClientProps {
  classes: ClassItem[];
  sections: Section[];
  canManage: boolean;
}

// Schemas
const classSchema = z.object({
  name: z.string().min(1, "Name is required"),
  level: z.number().int().min(1, "Level is required"),
  description: z.string().optional(),
});

const sectionSchema = z.object({
  classId: z.string().min(1, "Class is required"),
  name: z.string().min(1, "Section name is required"),
  maxCapacity: z.number().int().min(1),
});

type ClassFormData = z.infer<typeof classSchema>;
type SectionFormData = z.infer<typeof sectionSchema>;

// Components
function AddClassForm({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
  });

  const onSubmit = async (data: ClassFormData) => {
    try {
      const res = await fetch("/api/academic/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create class");
      }

      toast.success("Class created successfully");
      reset();
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create class");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Class Name *</Label>
        <Input id="name" placeholder="e.g. Grade 10" {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="level">Level *</Label>
        <Input
          id="level"
          type="number"
          min={1}
          placeholder="e.g. 10"
          {...register("level", { valueAsNumber: true })}
        />
        {errors.level && <p className="text-xs text-destructive">{errors.level.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" placeholder="Optional description" {...register("description")} />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Class"
          )}
        </Button>
      </div>
    </form>
  );
}

function AddSectionForm({
  classes,
  onSuccess,
}: {
  classes: ClassItem[];
  onSuccess: () => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SectionFormData>({
    resolver: zodResolver(sectionSchema),
    defaultValues: { maxCapacity: 40 },
  });

  const onSubmit = async (data: SectionFormData) => {
    try {
      const res = await fetch("/api/academic/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create section");
      }

      toast.success("Section created successfully");
      reset();
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create section");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>Select Class *</Label>
        <Select onValueChange={(v) => setValue("classId", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select a class" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} (Level {c.level})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.classId && <p className="text-xs text-destructive">{errors.classId.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Section Name *</Label>
        <Input id="name" placeholder="e.g. A" {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="maxCapacity">Max Capacity</Label>
        <Input
          id="maxCapacity"
          type="number"
          min={1}
          {...register("maxCapacity", { valueAsNumber: true })}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Section"
          )}
        </Button>
      </div>
    </form>
  );
}

export function ClassesClient({
  classes: initialClasses,
  sections: initialSections,
  canManage,
}: ClassesClientProps) {
  const [classes, setClasses] = useState(initialClasses);
  const [sections, setSections] = useState(initialSections);
  const [addClassOpen, setAddClassOpen] = useState(false);
  const [addSectionOpen, setAddSectionOpen] = useState(false);

  const refreshData = async () => {
    try {
      const [classesRes, sectionsRes] = await Promise.all([
        fetch("/api/academic/classes"),
        fetch("/api/academic/sections"),
      ]);
      
      if (classesRes.ok) {
        const classesData = await classesRes.json();
        setClasses(classesData);
      }
      
      if (sectionsRes.ok) {
        const sectionsData = await sectionsRes.json();
        setSections(sectionsData);
      }
    } catch {
      toast.error("Failed to refresh data");
    }
  };

  const totalStudents = sections.reduce((sum, s) => sum + s._count.students, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Classes & Sections
          </h1>
          <p className="text-muted-foreground">
            {classes.length} classes · {sections.length} sections · {totalStudents} students
          </p>
        </div>

        {canManage && (
          <div className="flex gap-2">
            <Dialog open={addSectionOpen} onOpenChange={setAddSectionOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Section
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Section</DialogTitle>
                </DialogHeader>
                <AddSectionForm
                  classes={classes}
                  onSuccess={() => {
                    setAddSectionOpen(false);
                    refreshData();
                  }}
                />
              </DialogContent>
            </Dialog>

            <Dialog open={addClassOpen} onOpenChange={setAddClassOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Class
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Class</DialogTitle>
                </DialogHeader>
                <AddClassForm
                  onSuccess={() => {
                    setAddClassOpen(false);
                    refreshData();
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No classes created yet</p>
              {canManage && (
                <Button className="mt-4" onClick={() => setAddClassOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Class
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          classes.map((cls) => (
            <Card key={cls.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{cls.name}</CardTitle>
                  <Badge variant="outline">Level {cls.level}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    {cls._count.sections} sections
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {cls.sections.reduce((sum, s) => sum + s._count.students, 0)} students
                  </div>
                </div>

                {cls.sections.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {cls.sections.map((section) => (
                      <Badge key={section.id} variant="secondary" className="text-xs">
                        {section.name} ({section._count.students})
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Sections Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Sections</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Section</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No sections created yet
                  </TableCell>
                </TableRow>
              ) : (
                sections.map((section) => (
                  <TableRow key={section.id}>
                    <TableCell className="font-medium">{section.name}</TableCell>
                    <TableCell>{section.class.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{section._count.students}</Badge>
                    </TableCell>
                    <TableCell>{section.maxCapacity}</TableCell>
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
