"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, BookOpen, Calendar, Eye } from "lucide-react";

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

export function ExamsClient({ academicYears, terms, sections, subjects }: ExamsClientProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>(
    academicYears.find((y) => y.isCurrent)?.id || ""
  );

  // Form state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubjectsOpen, setIsSubjectsOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [examSubjects, setExamSubjects] = useState<ExamSubject[]>([]);
  const [formLoading, setFormLoading] = useState(false);

  // Create exam form
  const [examName, setExamName] = useState("");
  const [examTerm, setExamTerm] = useState("");
  const [examStartDate, setExamStartDate] = useState("");
  const [examEndDate, setExamEndDate] = useState("");

  // Add subject form
  const [subjectId, setSubjectId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [maxMarks, setMaxMarks] = useState("100");
  const [passMark, setPassMark] = useState("40");
  const [examDate, setExamDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState("");
  const [venue, setVenue] = useState("");

  useEffect(() => {
    fetchExams();
  }, [selectedYear]);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedYear) params.append("academicYearId", selectedYear);

      const res = await fetch(`/api/exams?${params}`);
      if (res.ok) {
        const data = await res.json();
        setExams(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch exams:", error);
      toast.error("Failed to load exams");
    } finally {
      setLoading(false);
    }
  };

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
          academicYearId: selectedYear,
          termId: examTerm || undefined,
          startDate: examStartDate,
          endDate: examEndDate,
        }),
      });

      if (res.ok) {
        toast.success("Exam created successfully");
        setIsCreateOpen(false);
        resetForm();
        fetchExams();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create exam");
      }
    } catch (error) {
      toast.error("Failed to create exam");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteExam = async (examId: string) => {
    if (!confirm("Are you sure you want to delete this exam? This will also delete all results.")) {
      return;
    }

    try {
      const res = await fetch(`/api/exams/${examId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Exam deleted successfully");
        fetchExams();
      } else {
        toast.error("Failed to delete exam");
      }
    } catch (error) {
      toast.error("Failed to delete exam");
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
    } catch (error) {
      toast.error("Failed to update exam");
    }
  };

  const openSubjectsDialog = async (exam: Exam) => {
    setSelectedExam(exam);
    try {
      const res = await fetch(`/api/exams/${exam.id}/subjects`);
      if (res.ok) {
        const data = await res.json();
        setExamSubjects(data);
      }
    } catch (error) {
      toast.error("Failed to load exam subjects");
    }
    setIsSubjectsOpen(true);
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
        // Refresh subjects
        const subjectsRes = await fetch(`/api/exams/${selectedExam?.id}/subjects`);
        if (subjectsRes.ok) {
          setExamSubjects(await subjectsRes.json());
        }
        resetSubjectForm();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to add subject");
      }
    } catch (error) {
      toast.error("Failed to add subject");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (!confirm("Are you sure? This will delete all results for this subject.")) {
      return;
    }

    try {
      const res = await fetch(`/api/exams/${selectedExam?.id}/subjects/${subjectId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Subject removed");
        setExamSubjects(examSubjects.filter((es) => es.id !== subjectId));
      } else {
        toast.error("Failed to remove subject");
      }
    } catch (error) {
      toast.error("Failed to remove subject");
    }
  };

  const resetForm = () => {
    setExamName("");
    setExamTerm("");
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[200px]">
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
                <Label htmlFor="term">Term (Optional)</Label>
                <Select value={examTerm} onValueChange={setExamTerm}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent>
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
                  {formLoading ? "Creating..." : "Create Exam"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Examinations</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading exams...</div>
          ) : exams.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No exams found. Create your first exam to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam Name</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Date Range</TableHead>
                  <TableHead>Subjects</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell className="font-medium">{exam.name}</TableCell>
                    <TableCell>{exam.term?.name || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(exam.startDate), "MMM d")} -{" "}
                        {format(new Date(exam.endDate), "MMM d, yyyy")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{exam._count?.examSubjects || 0} subjects</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={exam.isPublished ? "default" : "outline"}>
                        {exam.isPublished ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openSubjectsDialog(exam)}
                          title="Manage Subjects"
                        >
                          <BookOpen className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTogglePublish(exam)}
                          title={exam.isPublished ? "Unpublish" : "Publish Results"}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteExam(exam.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Section *</Label>
                    <Select value={sectionId} onValueChange={setSectionId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {sections.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.class.name} - {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Max Marks</Label>
                    <Input
                      type="number"
                      value={maxMarks}
                      onChange={(e) => setMaxMarks(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pass Mark</Label>
                    <Input
                      type="number"
                      value={passMark}
                      onChange={(e) => setPassMark(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Exam Date *</Label>
                    <Input
                      type="date"
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (min)</Label>
                    <Input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="e.g., 60"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Venue</Label>
                    <Input
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      placeholder="e.g., Room 101"
                    />
                  </div>
                </div>
                <Button className="mt-4" onClick={handleAddSubject} disabled={formLoading}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Subject
                </Button>
              </CardContent>
            </Card>

            {/* Subjects List */}
            <div className="border rounded-lg">
              {examSubjects.length === 0 ? (
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
                      <TableHead>Results</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {examSubjects.map((es) => (
                      <TableRow key={es.id}>
                        <TableCell className="font-medium">{es.subject?.name ?? "N/A"}</TableCell>
                        <TableCell>
                          {es.section?.class?.name ?? "N/A"} - {es.section?.name ?? "N/A"}
                        </TableCell>
                        <TableCell>
                          {es.maxMarks}/{es.passMark}
                        </TableCell>
                        <TableCell>
                          <div>
                            {format(new Date(es.examDate), "MMM d, yyyy")}
                            {es.startTime && <span className="text-muted-foreground ml-1">{es.startTime}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{es._count?.examResults || 0}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSubject(es.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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
    </div>
  );
}