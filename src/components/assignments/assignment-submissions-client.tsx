"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Loader2, ArrowLeft, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Submission {
  id: string;
  content: string | null;
  fileUrl: string | null;
  submittedAt: string;
  isLate: boolean;
  marks: number | null;
  feedback: string | null;
  gradedAt: string | null;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    studentId: string;
  };
}

interface Assignment {
  id: string;
  title: string;
  maxMarks: number;
  dueDate: string;
}

interface AssignmentSubmissionsClientProps {
  assignment: Assignment;
  onBack: () => void;
}

export default function AssignmentSubmissionsClient({
  assignment,
  onBack,
}: AssignmentSubmissionsClientProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Grade form state
  const [gradeData, setGradeData] = useState({
    marks: 0,
    feedback: "",
  });

  useEffect(() => {
    fetchSubmissions();
  }, [assignment.id]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/assignments/${assignment.id}/submissions`);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data);
      }
    } catch (error) {
      console.error("Failed to fetch submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const openGradeDialog = (submission: Submission) => {
    setGradingSubmission(submission);
    setGradeData({
      marks: submission.marks || 0,
      feedback: submission.feedback || "",
    });
    setGradeDialogOpen(true);
  };

  const handleGrade = async () => {
    if (!gradingSubmission) return;

    setSaving(true);
    try {
      const res = await fetch(
        `/api/assignments/${assignment.id}/submissions/${gradingSubmission.student.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(gradeData),
        }
      );

      if (res.ok) {
        toast.success("Submission graded successfully");
        setGradeDialogOpen(false);
        fetchSubmissions();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to grade submission");
      }
    } catch (error) {
      console.error("Failed to grade:", error);
      toast.error("Failed to grade submission");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Calculate stats
  const totalSubmissions = submissions.length;
  const gradedCount = submissions.filter((s) => s.marks !== null).length;
  const lateCount = submissions.filter((s) => s.isLate).length;
  const avgMarks =
    gradedCount > 0
      ? (
          submissions
            .filter((s) => s.marks !== null)
            .reduce((sum, s) => sum + (s.marks || 0), 0) / gradedCount
        ).toFixed(1)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h2 className="text-xl font-semibold">{assignment.title}</h2>
          <p className="text-sm text-gray-600">
            Due: {formatDate(assignment.dueDate)} | Max Marks: {assignment.maxMarks}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-md">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalSubmissions}</p>
                <p className="text-sm text-gray-600">Submissions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-md">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{gradedCount}</p>
                <p className="text-sm text-gray-600">Graded</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-md">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{lateCount}</p>
                <p className="text-sm text-gray-600">Late</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-md">
                <span className="text-purple-600 font-bold">Avg</span>
              </div>
              <div>
                <p className="text-2xl font-bold">{avgMarks}</p>
                <p className="text-sm text-gray-600">Avg Marks</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submissions List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No submissions yet
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <div
                  key={submission.id}
                  className="border rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">
                          {submission.student.firstName} {submission.student.lastName}
                        </h4>
                        <span className="text-sm text-gray-500">
                          ({submission.student.studentId})
                        </span>
                        {submission.isLate && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                            Late
                          </span>
                        )}
                        {submission.marks !== null && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                            Graded
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mb-2">
                        Submitted: {formatDate(submission.submittedAt)}
                      </p>

                      {submission.content && (
                        <div className="bg-gray-50 p-3 rounded-md mb-2">
                          <p className="text-sm whitespace-pre-wrap">{submission.content}</p>
                        </div>
                      )}

                      {submission.fileUrl && (
                        <a
                          href={submission.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          View Attachment ↗
                        </a>
                      )}

                      {submission.marks !== null && (
                        <div className="mt-2 flex items-center gap-4">
                          <span className="text-sm">
                            <span className="font-medium">Marks:</span>{" "}
                            <span className="text-green-600 font-bold">
                              {submission.marks}/{assignment.maxMarks}
                            </span>
                          </span>
                          {submission.feedback && (
                            <span className="text-sm text-gray-600">
                              Feedback: {submission.feedback}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant={submission.marks !== null ? "outline" : "default"}
                      onClick={() => openGradeDialog(submission)}
                    >
                      {submission.marks !== null ? "Edit Grade" : "Grade"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grade Dialog */}
      <Dialog open={gradeDialogOpen} onOpenChange={setGradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grade Submission</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {gradingSubmission && (
              <div className="bg-gray-50 p-3 rounded-md">
                <h4 className="font-medium">
                  {gradingSubmission.student.firstName} {gradingSubmission.student.lastName}
                </h4>
                <p className="text-sm text-gray-600">
                  Roll: {gradingSubmission.student.studentId}
                </p>
              </div>
            )}

            <div>
              <Label>Marks (out of {assignment.maxMarks})</Label>
              <Input
                type="number"
                min={0}
                max={assignment.maxMarks}
                value={gradeData.marks}
                onChange={(e) =>
                  setGradeData({ ...gradeData, marks: parseFloat(e.target.value) || 0 })
                }
              />
            </div>

            <div>
              <Label>Feedback (Optional)</Label>
              <Textarea
                value={gradeData.feedback}
                onChange={(e) => setGradeData({ ...gradeData, feedback: e.target.value })}
                placeholder="Feedback for the student..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGradeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGrade} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Grade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
