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
  Users,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  ListFilter,
  Grid3X3,
  CalendarDays,
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

// Helper to check if exam is ongoing
function getExamStatus(exam: Exam): { label: string; variant: "default" | "secondary" | "outline"; color: string } {
  const now = new Date();
  const start = new Date(exam.startDate);
  const end = new Date(exam.endDate);

  if (now < start) return { label: "Upcoming", variant: "outline", color: "text-blue-600 border-blue-600" };
  if (now > end) return { label: "Completed", variant: "secondary", color: "text-muted-foreground" };
  return { label: "Ongoing", variant: "default", color: "bg-green-100 text-green-800 hover:bg-green-100" };
}

type ExamSubject = {
  id: string;
  sectionId: string;
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
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

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

  // Edit subject state
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);

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
        let filteredExams = data.data;

        // Apply status filter
        if (statusFilter !== "ALL") {
          const now = new Date();
          filteredExams = filteredExams.filter((e: Exam) => {
            const start = new Date(e.startDate);
            const end = new Date(e.endDate);
            if (statusFilter === "UPCOMING") return now < start;
            if (statusFilter === "ONGOING") return now >= start && now <= end;
            if (statusFilter === "COMPLETED") return now > end;
            return true;
          });
        }

        setExams(filteredExams);
        setTotalPages(data.pagination?.totalPages ?? 1);
        setTotal(data.pagination?.total ?? 0);
      }
    } catch (error) {
      console.error("Failed to fetch exams:", error);
      toast.error("Failed to load exams");
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedTerm, search, page, statusFilter]);

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
    if (!editExamRef || !editName || !editStartDate || !editEndDate) {
      toast.error("Please fill all required fields");
      return;
    }

    setFormLoading(true);
    try {
      const res = await fetch(`/api/exams/${editExamRef.id}`, {
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
    setEditingSubjectId(null);
  };

  const handleUpdateSubject = async () => {
    if (!editingSubjectId || !selectedExam || !examDate) {
      toast.error("Please fill all required fields");
      return;
    }

    setFormLoading(true);
    try {
      const res = await fetch(`/api/exams/${selectedExam.id}/subjects/${editingSubjectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxMarks: parseFloat(maxMarks),
          passMark: parseFloat(passMark),
          examDate,
          startTime: startTime || null,
          duration: duration ? parseInt(duration) : null,
          venue: venue || null,
        }),
      });

      if (res.ok) {
        toast.success("Subject updated successfully");
        const subjectsRes = await fetch(`/api/exams/${selectedExam.id}/subjects`);
        if (subjectsRes.ok) {
          setExamSubjects(await subjectsRes.json());
        }
        resetSubjectForm();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to update subject");
      }
    } catch {
      toast.error("Failed to update subject");
    } finally {
      setFormLoading(false);
    }
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
            <SelectTrigger className="w-[180px]">
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
            <SelectTrigger className="w-[140px]">
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

          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="UPCOMING">Upcoming</SelectItem>
              <SelectItem value="ONGOING">Ongoing</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
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

        <div className="flex gap-2">
          <div className="border rounded-md flex">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              className="rounded-r-none"
              onClick={() => setViewMode("table")}
            >
              <ListFilter className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              className="rounded-l-none"
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
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
      </div>

      {/* Timeline Section - Upcoming & Ongoing Exams */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Exam Timeline</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Ongoing Exams */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  Ongoing Exams
                </CardTitle>
                <Badge variant="outline">
                  {exams.filter((e) => {
                    const now = new Date();
                    return now >= new Date(e.startDate) && now <= new Date(e.endDate);
                  }).length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {exams.filter((e) => {
                const now = new Date();
                return now >= new Date(e.startDate) && now <= new Date(e.endDate);
              }).length === 0 ? (
                <p className="text-sm text-muted-foreground">No ongoing exams</p>
              ) : (
                <div className="space-y-2">
                  {exams
                    .filter((e) => {
                      const now = new Date();
                      return now >= new Date(e.startDate) && now <= new Date(e.endDate);
                    })
                    .slice(0, 3)
                    .map((exam) => (
                      <div
                        key={exam.id}
                        className="flex items-center justify-between p-2 rounded-md bg-muted/50 cursor-pointer hover:bg-muted"
                        onClick={() => openViewDialog(exam)}
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium">{exam.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Ends {format(new Date(exam.endDate), "MMM d, yyyy")}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openViewDialog(exam); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Exams */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  Upcoming Exams
                </CardTitle>
                <Badge variant="outline">
                  {exams.filter((e) => new Date() < new Date(e.startDate)).length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {exams.filter((e) => new Date() < new Date(e.startDate)).length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming exams</p>
              ) : (
                <div className="space-y-2">
                  {exams
                    .filter((e) => new Date() < new Date(e.startDate))
                    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                    .slice(0, 3)
                    .map((exam) => (
                      <div
                        key={exam.id}
                        className="flex items-center justify-between p-2 rounded-md bg-muted/50 cursor-pointer hover:bg-muted"
                        onClick={() => openViewDialog(exam)}
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium">{exam.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Starts {format(new Date(exam.startDate), "MMM d, yyyy")}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openViewDialog(exam); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Exams</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{total}</p>
            <p className="text-xs text-muted-foreground mt-1">{exams.filter((e) => !e.isPublished).length} drafts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Published</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{exams.filter((e) => e.isPublished).length}</p>
            <p className="text-xs text-muted-foreground mt-1">Ready for viewing</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ongoing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {exams.filter((e) => {
                const now = new Date();
                return now >= new Date(e.startDate) && now <= new Date(e.endDate);
              }).length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Currently active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Subjects</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{exams.reduce((s, e) => s + (e._count?.examSubjects ?? 0), 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">Across all exams</p>
          </CardContent>
        </Card>
      </div>

      {/* Exams Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Examinations</h2>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? "exam" : "exams"} found
          </p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : exams.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No exams found</h3>
                <p className="text-muted-foreground mt-1">Create your first exam to get started</p>
                <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Exam
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : viewMode === "table" ? (
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exam Name</TableHead>
                    <TableHead>Academic Year</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Subjects</TableHead>
                    <TableHead>Publication</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.map((exam) => {
                    const durationDays = Math.ceil(
                      (new Date(exam.endDate).getTime() - new Date(exam.startDate).getTime()) /
                        (1000 * 60 * 60 * 24)
                    ) + 1;
                    const examStatus = getExamStatus(exam);

                    return (
                      <TableRow
                        key={exam.id}
                        className="cursor-pointer"
                        onClick={() => openViewDialog(exam)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{exam.name}</span>
                            <span className={`text-xs ${examStatus.color}`}>{examStatus.label}</span>
                          </div>
                        </TableCell>
                        <TableCell>{exam.academicYear?.name ?? "N/A"}</TableCell>
                        <TableCell>{exam.term?.name || "-"}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {format(new Date(exam.startDate), "MMM d")} -{" "}
                              {format(new Date(exam.endDate), "MMM d, yyyy")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{durationDays} {durationDays === 1 ? "day" : "days"}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{exam._count?.examSubjects || 0}</Badge>
                            {exam._count && exam._count.examSubjects === 0 && (
                              <span className="text-xs text-amber-600">No subjects</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={exam.isPublished ? "default" : "outline"}
                            className={exam.isPublished ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
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
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {total} exams
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
                    <span className="text-sm py-1">Page {page} of {totalPages}</span>
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
            </CardContent>
          </Card>
        ) : (
          /* Grid View */
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {exams.map((exam) => {
              const durationDays = Math.ceil(
                (new Date(exam.endDate).getTime() - new Date(exam.startDate).getTime()) /
                  (1000 * 60 * 60 * 24)
              ) + 1;
              const examStatus = getExamStatus(exam);

              return (
                <Card key={exam.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => openViewDialog(exam)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{exam.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">{exam.academicYear?.name}</p>
                      </div>
                      <Badge variant={exam.isPublished ? "default" : "outline"} className={exam.isPublished ? "bg-green-100 text-green-800" : ""}>
                        {exam.isPublished ? "Published" : "Draft"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(exam.startDate), "MMM d")} - {format(new Date(exam.endDate), "MMM d, yyyy")}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{durationDays} {durationDays === 1 ? "day" : "days"}</Badge>
                        <Badge variant="secondary">{exam._count?.examSubjects || 0} subjects</Badge>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${examStatus.color}`}>{examStatus.label}</span>
                    </div>
                    {exam.term && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        <span>{exam.term.name}</span>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="flex-1" onClick={() => openSubjectsDialog(exam)}>
                        <BookOpen className="h-3 w-3 mr-1" /> Subjects
                      </Button>
                      <Button variant="ghost" size="sm" className="flex-1" onClick={() => openEditDialog(exam)}>
                        <Pencil className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="flex-1 text-destructive" onClick={() => setDeleteExam(exam)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* View Exam Dialog */}
      <Dialog open={!!viewExam} onOpenChange={() => setViewExam(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{viewExam?.name}</DialogTitle>
          </DialogHeader>
          {viewExam && (
            <div className="space-y-6">
              {/* Status Badges */}
              <div className="flex gap-2">
                <Badge variant={viewExam.isPublished ? "default" : "outline"} className={viewExam.isPublished ? "bg-green-100 text-green-800" : ""}>
                  {viewExam.isPublished ? "Published" : "Draft"}
                </Badge>
                <Badge variant="outline">{getExamStatus(viewExam).label}</Badge>
              </div>

              {/* Exam Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <InfoItem label="Academic Year" value={viewExam.academicYear?.name} icon={<Calendar className="h-4 w-4" />} />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <InfoItem label="Term" value={viewExam.term?.name || "Not assigned"} />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <InfoItem
                      label="Start Date"
                      value={format(new Date(viewExam.startDate), "MMMM d, yyyy")}
                      icon={<Calendar className="h-4 w-4" />}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <InfoItem
                      label="End Date"
                      value={format(new Date(viewExam.endDate), "MMMM d, yyyy")}
                      icon={<Calendar className="h-4 w-4" />}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Duration Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Exam Duration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {Math.ceil((new Date(viewExam.endDate).getTime() - new Date(viewExam.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} days
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({format(new Date(viewExam.startDate), "MMM d")} - {format(new Date(viewExam.endDate), "MMM d, yyyy")})
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Subjects Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Subjects Registered
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{viewExam._count?.examSubjects ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {viewExam._count && viewExam._count.examSubjects === 0
                      ? "No subjects added yet. Click 'Manage Subjects' to add."
                      : "subjects configured for this exam"}
                  </p>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => { const exam = viewExam; setViewExam(null); openSubjectsDialog(exam); }}>
                  <BookOpen className="w-4 h-4 mr-1" /> Manage Subjects
                </Button>
                <Button variant="outline" size="sm" onClick={() => { const exam = viewExam; setViewExam(null); openEditDialog(exam); }}>
                  <Pencil className="w-4 h-4 mr-1" /> Edit Exam
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { const exam = viewExam; setViewExam(null); handleTogglePublish(exam); }}
                >
                  <Eye className="w-4 h-4 mr-1" /> {viewExam.isPublished ? "Unpublish" : "Publish"}
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
        <DialogContent className="sm:max-w-[98vw] w-full max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Manage Exam Subjects - {selectedExam?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold">{examSubjects.length}</p>
                  <p className="text-xs text-muted-foreground">Total Subjects</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold">{new Set(examSubjects.map((es) => es.sectionId)).size}</p>
                  <p className="text-xs text-muted-foreground">Sections</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold">
                    {examSubjects.reduce((sum, es) => sum + (es._count?.examResults ?? 0), 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Results Entered</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold">
                    {examSubjects.filter((es) => es.venue).length}
                  </p>
                  <p className="text-xs text-muted-foreground">With Venues</p>
                </CardContent>
              </Card>
            </div>

            {/* Add/Edit Subject Form */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {editingSubjectId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {editingSubjectId ? "Edit Subject" : "Add Subject to Exam"}
                  </CardTitle>
                  {editingSubjectId && (
                    <Badge variant="outline" className="text-xs">
                      Editing: {subjects.find(s => s.id === subjectId)?.name} - {sections.find(s => s.id === sectionId)?.class?.name} {sections.find(s => s.id === sectionId)?.name}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <div className="space-y-2">
                    <Label>Subject *</Label>
                    <Select value={subjectId} onValueChange={setSubjectId} disabled={!!editingSubjectId}>
                      <SelectTrigger className={editingSubjectId ? "bg-muted" : ""}>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Section *</Label>
                    <Select value={sectionId} onValueChange={setSectionId} disabled={!!editingSubjectId}>
                      <SelectTrigger className={editingSubjectId ? "bg-muted" : ""}>
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
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
                    <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="60" />
                  </div>
                  <div className="space-y-2">
                    <Label>Venue</Label>
                    <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Room 101" />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <div className="flex items-center gap-2">
                    <Button onClick={editingSubjectId ? handleUpdateSubject : handleAddSubject} disabled={formLoading}>
                      {formLoading ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{editingSubjectId ? "Updating..." : "Adding..."}</>
                      ) : (
                        <>{editingSubjectId ? <Pencil className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}{editingSubjectId ? "Update Subject" : "Add Subject"}</>
                      )}
                    </Button>
                    {editingSubjectId && (
                      <Button variant="outline" onClick={resetSubjectForm}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subjects List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ListFilter className="h-4 w-4" />
                    Registered Subjects
                  </CardTitle>
                  <Badge variant="outline">{examSubjects.length} total</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {subjectsLoading ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : examSubjects.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">No subjects added yet</h3>
                    <p className="text-muted-foreground mt-1">Add subjects to configure exam details for each section</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead>Section</TableHead>
                          <TableHead className="text-center">Max/Pass</TableHead>
                          <TableHead>Date & Time</TableHead>
                          <TableHead>Venue</TableHead>
                          <TableHead className="text-center">Results</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {examSubjects.map((es) => (
                          <TableRow key={es.id}>
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <span>{es.subject?.name ?? "N/A"}</span>
                                {es.subject?.code && (
                                  <span className="text-xs text-muted-foreground">{es.subject.code}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span>{es.section?.class?.name ?? "N/A"}</span>
                                <span className="text-xs text-muted-foreground">{es.section?.name ?? "N/A"}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">{es.maxMarks}/{es.passMark}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-muted-foreground" />
                                  {format(new Date(es.examDate), "MMM d, yyyy")}
                                </div>
                                {es.startTime && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {es.startTime}
                                    {es.duration && <span className="ml-1">({es.duration} min)</span>}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {es.venue ? (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-sm">{es.venue}</span>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">Not set</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={es._count?.examResults ? "default" : "secondary"}>
                                {es._count?.examResults || 0}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingSubjectId(es.id);
                                    setSubjectId(es.subject.id);
                                    setSectionId(es.section.id);
                                    setMaxMarks(es.maxMarks.toString());
                                    setPassMark(es.passMark.toString());
                                    setExamDate(es.examDate.split("T")[0]);
                                    setStartTime(es.startTime || "");
                                    setDuration(es.duration?.toString() || "");
                                    setVenue(es.venue || "");
                                  }}
                                  title="Edit subject"
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => setDeleteSubject(es)}
                                  title="Remove subject"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Tips */}
            <Card className="bg-blue-50 dark:bg-blue-950/20">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Quick Tips</p>
                    <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                      <li>• Add subjects for each section that will take the exam</li>
                      <li>• Set exam dates and times to help students plan their study schedule</li>
                      <li>• Specify venues to avoid confusion on exam day</li>
                      <li>• Enter results after grading is complete</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
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