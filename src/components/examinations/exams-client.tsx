"use client";

import { useState, useEffect, useCallback } from "react";
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
  Pencil,
  Trash2,
  BookOpen,
  Calendar,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Clock,
  MapPin,
} from "lucide-react";

type AcademicYear = { id: string; name: string; isCurrent: boolean };
type Term = { id: string; name: string };
type Section = { id: string; name: string; class: { id: string; name: string; level: number } };
type Subject = { id: string; name: string; code: string };

type Exam = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isPublished: boolean;
  academicYear: { id: string; name: string };
  term?: { id: string; name: string } | null;
  _count?: { examSubjects: number };
};

type ExamSubject = {
  id: string;
  maxMarks: number;
  passMark: number;
  examDate: string;
  startTime?: string | null;
  duration?: number | null;
  venue?: string | null;
  subject: { id: string; name: string; code: string };
  section: { id: string; name: string; class: { id: string; name: string } };
  _count?: { examResults: number };
};

interface ExamsClientProps {
  academicYears: AcademicYear[];
  terms: Term[];
  sections: Section[];
  subjects: Subject[];
}

// Info item helper
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

export function ExamsClient({ academicYears, terms, sections, subjects }: ExamsClientProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>(
    academicYears.find((y) => y.isCurrent)?.id || "ALL"
  );
  const [selectedTerm, setSelectedTerm] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [viewExam, setViewExam] = useState<Exam | null>(null);
  const [deleteExam, setDeleteExam] = useState<Exam | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Subjects dialog
  const [isSubjectsOpen, setIsSubjectsOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [examSubjects, setExamSubjects] = useState<ExamSubject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Create exam form
  const [examName, setExamName] = useState("");
  const [examTerm, setExamTerm] = useState("NONE");
  const [examStartDate, setExamStartDate] = useState("");
  const [examEndDate, setExamEndDate] = useState("");

  // Edit exam form
  const [editName, setEditName] = useState("");
  const [editTerm, setEditTerm] = useState("NONE");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");

  // Add subject form
  const [subjectId, setSubjectId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [maxMarks, setMaxMarks] = useState("100");
  const [passMark, setPassMark] = useState("40");
  const [examDate, setExamDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState("");
  const [venue, setVenue] = useState("");

  // Delete subject
  const [deleteSubject, setDeleteSubject] = useState<ExamSubject | null>(null);
  const [deletingSubject, setDeletingSubject] = useState(false);

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedYear && selectedYear !== "ALL") params.append("academicYearId", selectedYear);
      if (selectedTerm && selectedTerm !== "ALL") params.append("termId", selectedTerm);
      if (search) params.append("search", search);
      params.append("page", page.toString());
      params.append("limit", "20");

      const res = await fetch(`/api/exams?${params}`);
      if (res.ok) {
        const data = await res.json();
        setExams(data.data);
        setTotalPages(data.pagination?.totalPages ?? 1);
        setTotal(data.pagination?.total ?? 0);
      }
    } catch (error) {
      console.error("Failed to fetch exams:", error);
      toast.error("Failed to load exams");
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedTerm, search, page]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const handleCreateExam = async () => {
    if (!examName || !examStartDate || !examEndDate) {
      toast.error("Please fill all required fields");
      return;
    }

    setFormLoading(true);
    try {
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: examName,
          academicYearId: selectedYear && selectedYear !== "ALL" ? selectedYear : academicYears.find((y) => y.isCurrent)?.id,
          termId: examTerm === "NONE" ? undefined : examTerm,
          startDate: examStartDate,
          endDate: examEndDate,
        }),
      });

      if (res.ok) {
        toast.success("Exam created successfully");
        setIsCreateOpen(false);
        resetCreateForm();
        fetchExams();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create exam");
      }
    } catch {
      toast.error("Failed to create exam");
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditExam = async () => {
    if (!viewExam || !editName || !editStartDate || !editEndDate) {
      toast.error("Please fill all required fields");
      return;
    }

    setFormLoading(true);
    try {
      const res = await fetch(`/api/exams/${viewExam.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          termId: editTerm === "NONE" ? null : editTerm,
          startDate: editStartDate,
          endDate: editEndDate,
        }),
      });

      if (res.ok) {
        toast.success("Exam updated successfully");
        setIsEditOpen(false);
        fetchExams();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to update exam");
      }
    } catch {
      toast.error("Failed to update exam");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteExam = async () => {
    if (!deleteExam) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/exams/${deleteExam.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Exam deleted successfully");
        setDeleteExam(null);
        fetchExams();
      } else {
        toast.error("Failed to delete exam");
      }
    } catch {
      toast.error("Failed to delete exam");
    } finally {
      setDeleting(false);
    }
  };

  const handleTogglePublish = async (exam: Exam) => {
    try {
      const res = await fetch(`/api/exams/${exam.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !exam.isPublished }),
      });

      if (res.ok) {
        toast.success(exam.isPublished ? "Results unpublished" : "Results published");
        fetchExams();
      } else {
        toast.error("Failed to update exam");
      }
    } catch {
      toast.error("Failed to update exam");
    }
  };

  const openSubjectsDialog = async (exam: Exam) => {
    setSelectedExam(exam);
    setSubjectsLoading(true);
    setIsSubjectsOpen(true);
    try {
      const res = await fetch(`/api/exams/${exam.id}/subjects`);
      if (res.ok) {
        const data = await res.json();
        setExamSubjects(data);
      }
    } catch {
      toast.error("Failed to load exam subjects");
    } finally {
      setSubjectsLoading(false);
    }
  };

  const handleAddSubject = async () => {
    if (!subjectId || !sectionId || !examDate) {
      toast.error("Please fill all required fields");
      return;
    }

    setFormLoading(true);
    try {
      const res = await fetch(`/api/exams/${selectedExam?.id}/subjects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId,
          sectionId,
          maxMarks: parseFloat(maxMarks),
          passMark: parseFloat(passMark),
          examDate,
          startTime: startTime || undefined,
          duration: duration ? parseInt(duration) : undefined,
          venue: venue || undefined,
        }),
      });

      if (res.ok) {
        toast.success("Subject added successfully");
        const subjectsRes = await fetch(`/api/exams/${selectedExam?.id}/subjects`);
        if (subjectsRes.ok) {
          setExamSubjects(await subjectsRes.json());
        }
        resetSubjectForm();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to add subject");
      }
    } catch {
      toast.error("Failed to add subject");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteSubject = async () => {
    if (!deleteSubject || !selectedExam) return;
    setDeletingSubject(true);
    try {
      const res = await fetch(`/api/exams/${selectedExam.id}/subjects/${deleteSubject.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Subject removed");
        setExamSubjects(examSubjects.filter((es) => es.id !== deleteSubject.id));
        setDeleteSubject(null);
      } else {
        toast.error("Failed to remove subject");
      }
    } catch {
      toast.error("Failed to remove subject");
    } finally {
      setDeletingSubject(false);
    }
  };

  const resetCreateForm = () => {
    setExamName("");
    setExamTerm("NONE");
    setExamStartDate("");
    setExamEndDate("");
  };

  const resetSubjectForm = () => {
    setSubjectId("");
    setSectionId("");
    setMaxMarks("100");
    setPassMark("40");
    setExamDate("");
    setStartTime("");
    setDuration("");
    setVenue("");
  };

  const openEditDialog = (exam: Exam) => {
    setViewExam(null);
    setEditName(exam.name);
    setEditTerm(exam.term?.id ?? "NONE");
    setEditStartDate(exam.startDate.split("T")[0]);
    setEditEndDate(exam.endDate.split("T")[0]);
    // Store exam ref for edit
    setEditExamRef(exam);
    setIsEditOpen(true);
  };

  // We need a ref for the edit dialog since viewExam gets cleared
  const [editExamRef, setEditExamRef] = useState<Exam | null>(null);

  const openViewDialog = async (exam: Exam) => {
    setViewExam(exam);
  };

  // Filter terms based on selected year
  const filteredTerms = selectedYear && selectedYear !== "ALL"
    ? terms
    : terms;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-wrap gap-2">
          <Select value={selectedYear} onValueChange={(v) => { setSelectedYear(v); setPage(1); }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select academic year" />
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

          <Select value={selectedTerm} onValueChange={(v) => { setSelectedTerm(v); setPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select term" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Terms</SelectItem>
              {terms.map((term) => (
                <SelectItem key={term.id} value={term.id}>
                  {term.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search exams..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 w-[200px]"
            />
          </div>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Exam
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Exam</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Exam Name *</Label>
                <Input
                  id="name"
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  placeholder="e.g., Mid-Term Examination"
                />
              </div>

              <div className="space-y-2">
                <Label>Term (Optional)</Label>
                <Select value={examTerm} onValueChange={setExamTerm}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">No Term</SelectItem>
                    {terms.map((term) => (
                      <SelectItem key={term.id} value={term.id}>
                        {term.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={examStartDate}
                    onChange={(e) => setExamStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={examEndDate}
                    onChange={(e) => setExamEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateExam} disabled={formLoading}>
                  {formLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : "Create Exam"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Exams</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Published</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{exams.filter((e) => e.isPublished).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{exams.filter((e) => !e.isPublished).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Subjects</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{exams.reduce((s, e) => s + (e._count?.examSubjects ?? 0), 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Exams Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Examinations</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : exams.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No exams found. Create your first exam to get started.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exam Name</TableHead>
                    <TableHead>Academic Year</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead>Subjects</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.map((exam) => (
                    <TableRow
                      key={exam.id}
                      className="cursor-pointer"
                      onClick={() => openViewDialog(exam)}
                    >
                      <TableCell className="font-medium">{exam.name}</TableCell>
                      <TableCell>{exam.academicYear?.name ?? "N/A"}</TableCell>
                      <TableCell>{exam.term?.name || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(exam.startDate), "MMM d")} -{" "}
                          {format(new Date(exam.endDate), "MMM d, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{exam._count?.examSubjects || 0}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={exam.isPublished ? "default" : "outline"}
                          className={exam.isPublished ? "bg-green-100 text-green-800" : ""}
                        >
                          {exam.isPublished ? "Published" : "Draft"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openSubjectsDialog(exam)}
                            title="Manage Subjects"
                          >
                            <BookOpen className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleTogglePublish(exam)}
                            title={exam.isPublished ? "Unpublish" : "Publish Results"}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(exam)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteExam(exam)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* View Exam Dialog */}
      <Dialog open={!!viewExam} onOpenChange={() => setViewExam(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Exam Details</DialogTitle>
          </DialogHeader>
          {viewExam && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoItem label="Name" value={viewExam.name} icon={<BookOpen className="h-4 w-4" />} />
                <InfoItem label="Status" value={viewExam.isPublished ? "Published" : "Draft"} />
                <InfoItem label="Academic Year" value={viewExam.academicYear?.name} icon={<Calendar className="h-4 w-4" />} />
                <InfoItem label="Term" value={viewExam.term?.name} />
                <InfoItem label="Start Date" value={format(new Date(viewExam.startDate), "MMM d, yyyy")} />
                <InfoItem label="End Date" value={format(new Date(viewExam.endDate), "MMM d, yyyy")} />
                <InfoItem label="Subjects" value={`${viewExam._count?.examSubjects ?? 0}`} icon={<BookOpen className="h-4 w-4" />} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => { const exam = viewExam; setViewExam(null); openSubjectsDialog(exam); }}>
                  <BookOpen className="w-4 h-4 mr-1" /> Manage Subjects
                </Button>
                <Button variant="outline" size="sm" onClick={() => { const exam = viewExam; setViewExam(null); openEditDialog(exam); }}>
                  <Pencil className="w-4 h-4 mr-1" /> Edit
                </Button>
                <Button variant="outline" size="sm" className="text-destructive" onClick={() => { const exam = viewExam; setViewExam(null); setDeleteExam(exam); }}>
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Exam Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Exam</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Exam Name *</Label>
              <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Term (Optional)</Label>
              <Select value={editTerm} onValueChange={setEditTerm}>
                <SelectTrigger>
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No Term</SelectItem>
                  {terms.map((term) => (
                    <SelectItem key={term.id} value={term.id}>
                      {term.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-startDate">Start Date *</Label>
                <Input id="edit-startDate" type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-endDate">End Date *</Label>
                <Input id="edit-endDate" type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button onClick={handleEditExam} disabled={formLoading}>
                {formLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</> : "Update"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Exam Confirmation */}
      <AlertDialog open={!!deleteExam} onOpenChange={() => setDeleteExam(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exam</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>&quot;{deleteExam?.name}&quot;</strong>? This will also delete all associated subjects and results. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExam} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage Subjects Dialog */}
      <Dialog open={isSubjectsOpen} onOpenChange={setIsSubjectsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Exam Subjects - {selectedExam?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Add Subject Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Add Subject to Exam</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Subject *</Label>
                    <Select value={subjectId} onValueChange={setSubjectId}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {subjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Section *</Label>
                    <Select value={sectionId} onValueChange={setSectionId}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {sections.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.class.name} - {s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Max Marks</Label>
                    <Input type="number" value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Pass Mark</Label>
                    <Input type="number" value={passMark} onChange={(e) => setPassMark(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Exam Date *</Label>
                    <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (min)</Label>
                    <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g., 60" />
                  </div>
                  <div className="space-y-2">
                    <Label>Venue</Label>
                    <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g., Room 101" />
                  </div>
                </div>
                <Button className="mt-4" onClick={handleAddSubject} disabled={formLoading}>
                  {formLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding...</> : <><Plus className="h-4 w-4 mr-2" />Add Subject</>}
                </Button>
              </CardContent>
            </Card>

            {/* Subjects List */}
            <div className="border rounded-lg">
              {subjectsLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : examSubjects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No subjects added yet. Add subjects to this exam.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Max/Pass</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Venue</TableHead>
                      <TableHead>Results</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {examSubjects.map((es) => (
                      <TableRow key={es.id}>
                        <TableCell className="font-medium">{es.subject?.name ?? "N/A"}</TableCell>
                        <TableCell>{es.section?.class?.name ?? "N/A"} - {es.section?.name ?? "N/A"}</TableCell>
                        <TableCell>{es.maxMarks}/{es.passMark}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {format(new Date(es.examDate), "MMM d, yyyy")}
                            {es.startTime && <span className="text-muted-foreground ml-1">{es.startTime}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {es.venue ? (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              {es.venue}
                            </div>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{es._count?.examResults || 0}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteSubject(es)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Subject Confirmation */}
      <AlertDialog open={!!deleteSubject} onOpenChange={() => setDeleteSubject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Subject</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{deleteSubject?.subject?.name}</strong> from this exam?
              This will also delete all results for this subject. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSubject} disabled={deletingSubject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingSubject ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}