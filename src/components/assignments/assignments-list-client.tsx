"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  Plus,
  Calendar,
  Clock,
  FileText,
  Users,
  Search,
  Pencil,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Link,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  maxMarks: number;
  allowLate: boolean;
  latePenalty: number | null;
  fileUrl: string | null;
  createdAt: string;
  subject: { id: string; name: string; code: string };
  section: { id: string; name: string; class: { id: string; name: string } };
  _count?: { submissions: number };
  status?: string;
  submission?: {
    id: string;
    marks: number | null;
    submittedAt: string;
  } | null;
}

interface ClassWithSections {
  id: string;
  name: string;
  level: number;
  sections: { id: string; name: string }[];
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface AssignmentsListClientProps {
  classes: ClassWithSections[];
  subjects: Subject[];
  studentSection: { id: string; name: string; class: { id: string; name: string } } | null;
  teacherStaffId: string | null;
  userRole: string;
  canManage: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  submitted: "bg-blue-100 text-blue-800",
  graded: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
};

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

export default function AssignmentsListClient({
  classes,
  subjects,
  studentSection,
  teacherStaffId,
  userRole,
  canManage,
}: AssignmentsListClientProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSectionId, setSelectedSectionId] = useState<string>("ALL");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewAssignment, setViewAssignment] = useState<Assignment | null>(null);
  const [deleteAssignment, setDeleteAssignment] = useState<Assignment | null>(null);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Create form
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subjectId: "",
    sectionId: "",
    dueDate: "",
    maxMarks: 100,
    allowLate: false,
    latePenalty: 0,
    fileUrl: "",
  });

  // Edit form
  const [editData, setEditData] = useState({
    id: "",
    title: "",
    description: "",
    subjectId: "",
    dueDate: "",
    maxMarks: 100,
    allowLate: false,
    latePenalty: 0,
    fileUrl: "",
  });

  // Submission form
  const [submissionData, setSubmissionData] = useState({
    content: "",
    fileUrl: "",
  });

  // Auto-select student's section
  useEffect(() => {
    if (studentSection) {
      setSelectedSectionId(studentSection.id);
    }
  }, [studentSection]);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSectionId && selectedSectionId !== "ALL") params.append("sectionId", selectedSectionId);
      if (selectedSubjectId && selectedSubjectId !== "ALL") params.append("subjectId", selectedSubjectId);
      if (search) params.append("search", search);
      params.append("page", page.toString());
      params.append("limit", "20");

      const res = await fetch(`/api/assignments?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.data ?? data);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages);
          setTotal(data.pagination.total);
        }
      }
    } catch (error) {
      console.error("Failed to fetch assignments:", error);
      toast.error("Failed to load assignments");
    } finally {
      setLoading(false);
    }
  }, [selectedSectionId, selectedSubjectId, search, page, refreshKey]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const openCreateDialog = () => {
    setFormData({
      title: "",
      description: "",
      subjectId: "",
      sectionId: selectedSectionId !== "ALL" ? selectedSectionId : "",
      dueDate: "",
      maxMarks: 100,
      allowLate: false,
      latePenalty: 0,
      fileUrl: "",
    });
    setCreateDialogOpen(true);
  };

  const openEditDialog = (assignment: Assignment) => {
    setViewAssignment(null);
    setEditData({
      id: assignment.id,
      title: assignment.title,
      description: assignment.description ?? "",
      subjectId: assignment.subject.id,
      dueDate: assignment.dueDate.split("T")[0] + "T" + (assignment.dueDate.split("T")[1]?.slice(0, 5) ?? "00:00"),
      maxMarks: assignment.maxMarks,
      allowLate: assignment.allowLate,
      latePenalty: assignment.latePenalty ?? 0,
      fileUrl: assignment.fileUrl ?? "",
    });
    setEditDialogOpen(true);
  };

  const openSubmitDialog = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setSubmissionData({ content: "", fileUrl: "" });
    setSubmitDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.subjectId || !formData.sectionId || !formData.dueDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success("Assignment created successfully");
        setCreateDialogOpen(false);
        // Set filters to the section and subject of the created assignment to show it
        // Also increment refreshKey to force a refetch
        setSelectedSectionId(formData.sectionId);
        setSelectedSubjectId(formData.subjectId);
        setPage(1);
        setRefreshKey((k) => k + 1);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create assignment");
      }
    } catch {
      toast.error("Failed to create assignment");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editData.title || !editData.subjectId || !editData.dueDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/assignments/${editData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editData.title,
          description: editData.description,
          subjectId: editData.subjectId,
          dueDate: editData.dueDate,
          maxMarks: editData.maxMarks,
          allowLate: editData.allowLate,
          latePenalty: editData.latePenalty,
          fileUrl: editData.fileUrl,
        }),
      });

      if (res.ok) {
        toast.success("Assignment updated successfully");
        setEditDialogOpen(false);
        setRefreshKey((k) => k + 1);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to update assignment");
      }
    } catch {
      toast.error("Failed to update assignment");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteAssignment) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/assignments/${deleteAssignment.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Assignment deleted successfully");
        setDeleteAssignment(null);
        setRefreshKey((k) => k + 1);
      } else {
        toast.error("Failed to delete assignment");
      }
    } catch {
      toast.error("Failed to delete assignment");
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAssignment) return;

    if (!submissionData.content && !submissionData.fileUrl) {
      toast.error("Please provide either content or a file URL");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/assignments/${selectedAssignment.id}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
      });

      if (res.ok) {
        toast.success("Assignment submitted successfully");
        setSubmitDialogOpen(false);
        setRefreshKey((k) => k + 1);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to submit assignment");
      }
    } catch {
      toast.error("Failed to submit assignment");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const statusCounts = {
    total: assignments.length,
    pending: assignments.filter((a) => a.status === "pending").length,
    submitted: assignments.filter((a) => a.status === "submitted").length,
    graded: assignments.filter((a) => a.status === "graded").length,
    overdue: assignments.filter((a) => a.status === "overdue").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Assignments
          </h1>
          <p className="text-muted-foreground">
            {canManage
              ? "Create and manage assignments, grade submissions"
              : "View and submit your assignments"}
            {" · "}{total} total
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            New Assignment
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {(canManage || userRole === "PARENT") && (
          <Select value={selectedSectionId} onValueChange={(v) => { setSelectedSectionId(v); setPage(1); }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All sections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Sections</SelectItem>
              {classes.map((cls) =>
                cls.sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {cls.name} - {section.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}

        <Select value={selectedSubjectId} onValueChange={(v) => { setSelectedSubjectId(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Subjects</SelectItem>
            {subjects.map((subject) => (
              <SelectItem key={subject.id} value={subject.id}>
                {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assignments..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
      </div>

      {/* Student Section Info */}
      {studentSection && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-3">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Your Class:</span>{" "}
              {studentSection.class.name} - {studentSection.name}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards (for students) */}
      {userRole === "STUDENT" && assignments.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-600">{statusCounts.pending}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Submitted</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{statusCounts.submitted}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Graded</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{statusCounts.graded}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{statusCounts.overdue}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Assignments List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No assignments found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => (
            <Card
              key={assignment.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setViewAssignment(assignment)}
            >
              <CardContent className="py-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{assignment.title}</h3>
                      {assignment.status && (
                        <Badge className={STATUS_COLORS[assignment.status] ?? ""}>
                          {(assignment.status ?? "").charAt(0).toUpperCase() + (assignment.status ?? "").slice(1)}
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-2">
                      <span className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {assignment.subject?.name ?? "N/A"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {assignment.section?.class?.name ?? "N/A"} - {assignment.section?.name ?? "N/A"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Due: {formatDate(assignment.dueDate)}
                        {isOverdue(assignment.dueDate) && !assignment.submission && (
                          <span className="text-red-600 ml-1">(Overdue)</span>
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {assignment.maxMarks} marks
                      </span>
                      {canManage && (
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {assignment._count?.submissions ?? 0} submissions
                        </span>
                      )}
                    </div>

                    {assignment.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {assignment.description}
                      </p>
                    )}

                    {assignment.submission && (
                      <div className="mt-2 text-sm">
                        <span className="text-muted-foreground">Submitted: </span>
                        <span className="text-green-600">
                          {formatDate(assignment.submission.submittedAt)}
                        </span>
                        {assignment.submission.marks !== null && (
                          <span className="ml-4">
                            <span className="text-muted-foreground">Marks: </span>
                            <span className="font-semibold text-green-600">
                              {assignment.submission.marks}/{assignment.maxMarks}
                            </span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    {userRole === "STUDENT" && !assignment.submission && (
                      <Button
                        size="sm"
                        onClick={() => openSubmitDialog(assignment)}
                        disabled={isOverdue(assignment.dueDate) && !assignment.allowLate}
                      >
                        Submit
                      </Button>
                    )}
                    {canManage && (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(assignment)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteAssignment(assignment)} title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* View Assignment Dialog */}
      <Dialog open={!!viewAssignment} onOpenChange={() => setViewAssignment(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assignment Details</DialogTitle>
          </DialogHeader>
          {viewAssignment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoItem label="Title" value={viewAssignment.title} icon={<FileText className="h-4 w-4" />} />
                <InfoItem label="Subject" value={viewAssignment.subject?.name} />
                <InfoItem label="Class" value={`${viewAssignment.section?.class?.name ?? "N/A"} - ${viewAssignment.section?.name ?? "N/A"}`} icon={<Users className="h-4 w-4" />} />
                <InfoItem label="Max Marks" value={`${viewAssignment.maxMarks}`} icon={<Clock className="h-4 w-4" />} />
                <InfoItem label="Due Date" value={formatDate(viewAssignment.dueDate)} icon={<Calendar className="h-4 w-4" />} />
                <InfoItem label="Late Submissions" value={viewAssignment.allowLate ? `Yes (${viewAssignment.latePenalty ?? 0}% penalty)` : "Not allowed"} />
              </div>

              {viewAssignment.description && (
                <div>
                  <p className="text-xs text-muted-foreground">Description</p>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{viewAssignment.description}</p>
                </div>
              )}

              {viewAssignment.fileUrl && (
                <div className="flex items-center gap-2">
                  <Link className="h-4 w-4 text-muted-foreground" />
                  <a href={viewAssignment.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                    Attachment
                  </a>
                </div>
              )}

              {canManage && (
                <div>
                  <p className="text-xs text-muted-foreground">Submissions</p>
                  <p className="text-sm font-medium">{viewAssignment._count?.submissions ?? 0} submitted</p>
                </div>
              )}

              {viewAssignment.submission && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <p className="text-sm font-medium text-green-800">Your Submission</p>
                  <p className="text-sm text-green-700">Submitted: {formatDate(viewAssignment.submission.submittedAt)}</p>
                  {viewAssignment.submission.marks !== null && (
                    <p className="text-sm text-green-700">Marks: {viewAssignment.submission.marks}/{viewAssignment.maxMarks}</p>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {userRole === "STUDENT" && !viewAssignment.submission && (
                  <Button size="sm" onClick={() => { const a = viewAssignment; setViewAssignment(null); openSubmitDialog(a); }}
                    disabled={isOverdue(viewAssignment.dueDate) && !viewAssignment.allowLate}>
                    Submit
                  </Button>
                )}
                {canManage && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => { const a = viewAssignment; setViewAssignment(null); openEditDialog(a); }}>
                      <Pencil className="w-4 h-4 mr-1" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => { const a = viewAssignment; setViewAssignment(null); setDeleteAssignment(a); }}>
                      <Trash2 className="w-4 h-4 mr-1" /> Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Assignment Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Assignment title"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Assignment instructions..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Section *</Label>
                <Select value={formData.sectionId} onValueChange={(v) => setFormData({ ...formData, sectionId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) =>
                      cls.sections.map((section) => (
                        <SelectItem key={section.id} value={section.id}>
                          {cls.name} - {section.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Subject *</Label>
                <Select value={formData.subjectId} onValueChange={(v) => setFormData({ ...formData, subjectId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Due Date *</Label>
                <Input
                  type="datetime-local"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Max Marks</Label>
                <Input
                  type="number"
                  value={formData.maxMarks}
                  onChange={(e) => setFormData({ ...formData, maxMarks: parseInt(e.target.value) || 100 })}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.allowLate}
                  onCheckedChange={(v) => setFormData({ ...formData, allowLate: v })}
                />
                <Label>Allow Late Submission</Label>
              </div>
              {formData.allowLate && (
                <div>
                  <Label>Late Penalty (%)</Label>
                  <Input
                    type="number"
                    className="w-24"
                    value={formData.latePenalty}
                    onChange={(e) => setFormData({ ...formData, latePenalty: parseInt(e.target.value) || 0 })}
                  />
                </div>
              )}
            </div>

            <div>
              <Label>Attachment URL (Optional)</Label>
              <Input
                type="url"
                value={formData.fileUrl}
                onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Assignment Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label>Subject *</Label>
              <Select value={editData.subjectId} onValueChange={(v) => setEditData({ ...editData, subjectId: v })}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Due Date *</Label>
                <Input
                  type="datetime-local"
                  value={editData.dueDate}
                  onChange={(e) => setEditData({ ...editData, dueDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Max Marks</Label>
                <Input
                  type="number"
                  value={editData.maxMarks}
                  onChange={(e) => setEditData({ ...editData, maxMarks: parseInt(e.target.value) || 100 })}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={editData.allowLate}
                  onCheckedChange={(v) => setEditData({ ...editData, allowLate: v })}
                />
                <Label>Allow Late Submission</Label>
              </div>
              {editData.allowLate && (
                <div>
                  <Label>Late Penalty (%)</Label>
                  <Input
                    type="number"
                    className="w-24"
                    value={editData.latePenalty}
                    onChange={(e) => setEditData({ ...editData, latePenalty: parseInt(e.target.value) || 0 })}
                  />
                </div>
              )}
            </div>

            <div>
              <Label>Attachment URL (Optional)</Label>
              <Input
                type="url"
                value={editData.fileUrl}
                onChange={(e) => setEditData({ ...editData, fileUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Assignment Confirmation */}
      <AlertDialog open={!!deleteAssignment} onOpenChange={() => setDeleteAssignment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>&quot;{deleteAssignment?.title}&quot;</strong>?
              This will also delete all submissions. This action cannot be undone.
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

      {/* Submit Assignment Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedAssignment && (
              <div className="bg-gray-50 p-3 rounded-md">
                <h4 className="font-medium">{selectedAssignment.title}</h4>
                <p className="text-sm text-muted-foreground">
                  Due: {formatDate(selectedAssignment.dueDate)} | Max Marks: {selectedAssignment.maxMarks}
                </p>
              </div>
            )}

            <div>
              <Label>Content</Label>
              <Textarea
                value={submissionData.content}
                onChange={(e) => setSubmissionData({ ...submissionData, content: e.target.value })}
                placeholder="Your answer or submission text..."
                rows={5}
              />
            </div>

            <div>
              <Label>File URL (Optional)</Label>
              <Input
                type="url"
                value={submissionData.fileUrl}
                onChange={(e) => setSubmissionData({ ...submissionData, fileUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}