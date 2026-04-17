"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Calendar, Clock, FileText, Users } from "lucide-react";
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
  const [selectedSectionId, setSelectedSectionId] = useState<string>("all");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
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

  // Submission form state
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

  // Fetch assignments
  useEffect(() => {
    fetchAssignments();
  }, [selectedSectionId, selectedSubjectId]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSectionId && selectedSectionId !== "all") params.append("sectionId", selectedSectionId);
      if (selectedSubjectId && selectedSubjectId !== "all") params.append("subjectId", selectedSubjectId);

      const res = await fetch(`/api/assignments?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAssignments(data);
      }
    } catch (error) {
      console.error("Failed to fetch assignments:", error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setFormData({
      title: "",
      description: "",
      subjectId: "",
      sectionId: selectedSectionId !== "all" ? selectedSectionId : "",
      dueDate: "",
      maxMarks: 100,
      allowLate: false,
      latePenalty: 0,
      fileUrl: "",
    });
    setCreateDialogOpen(true);
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
        fetchAssignments();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create assignment");
      }
    } catch (error) {
      console.error("Failed to create:", error);
      toast.error("Failed to create assignment");
    } finally {
      setSaving(false);
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
        fetchAssignments();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to submit assignment");
      }
    } catch (error) {
      console.error("Failed to submit:", error);
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

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            {(canManage || userRole === "PARENT") && (
              <div className="w-64">
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Class & Section
                </label>
                <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sections</SelectItem>
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
            )}

            <div className="w-48">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Subject
              </label>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="All subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All subjects</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {canManage && (
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                New Assignment
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Student's Section Info */}
      {studentSection && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-4">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Your Class:</span>{" "}
              {studentSection.class.name} - {studentSection.name}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Assignments List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : assignments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No assignments found
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {assignments.map((assignment) => (
            <Card key={assignment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{assignment.title}</h3>
                      {assignment.status && (
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            STATUS_COLORS[assignment.status]
                          }`}
                        >
                          {((assignment.status ?? "").charAt(0).toUpperCase() + (assignment.status ?? "").slice(1))}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-2">
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
                        {isOverdue(assignment.dueDate) && (
                          <span className="text-red-600 ml-1">(Overdue)</span>
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Max Marks: {assignment.maxMarks}
                      </span>
                    </div>

                    {assignment.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {assignment.description}
                      </p>
                    )}

                    {assignment.submission && (
                      <div className="mt-2 text-sm">
                        <span className="text-gray-600">Submitted: </span>
                        <span className="text-green-600">
                          {formatDate(assignment.submission.submittedAt)}
                        </span>
                        {assignment.submission.marks !== null && (
                          <span className="ml-4">
                            <span className="text-gray-600">Marks: </span>
                            <span className="font-semibold text-green-600">
                              {assignment.submission.marks}/{assignment.maxMarks}
                            </span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {userRole === "STUDENT" && !assignment.submission && (
                      <Button
                        size="sm"
                        onClick={() => openSubmitDialog(assignment)}
                        disabled={isOverdue(assignment.dueDate) && !assignment.allowLate}
                      >
                        Submit
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
                <Select
                  value={formData.sectionId}
                  onValueChange={(v) => setFormData({ ...formData, sectionId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
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
                <Select
                  value={formData.subjectId}
                  onValueChange={(v) => setFormData({ ...formData, subjectId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
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
                  onChange={(e) =>
                    setFormData({ ...formData, maxMarks: parseInt(e.target.value) || 100 })
                  }
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
                    onChange={(e) =>
                      setFormData({ ...formData, latePenalty: parseInt(e.target.value) || 0 })
                    }
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
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                <p className="text-sm text-gray-600">
                  Due: {formatDate(selectedAssignment.dueDate)} | Max Marks:{" "}
                  {selectedAssignment.maxMarks}
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
            <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>
              Cancel
            </Button>
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
