"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Save, Search } from "lucide-react";

type AcademicYear = { id: string; name: string; isCurrent: boolean };
type Section = { id: string; name: string; class: { id: string; name: string; level: number } };
type Subject = { id: string; name: string; code: string };

type Exam = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isPublished: boolean;
};

type ExamSubject = {
  id: string;
  maxMarks: number;
  passMark: number;
  examDate: string;
  subject: { id: string; name: string; code: string };
  section: { id: string; name: string; class: { id: string; name: string } };
};

type Student = {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
};

type Result = {
  id: string;
  examSubjectId: string;
  studentId: string;
  marksObtained: number;
  grade: string | null;
  remarks?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

interface EnterResultsClientProps {
  academicYears: AcademicYear[];
  sections: Section[];
  subjects: Subject[];
}

export function EnterResultsClient({ academicYears, sections }: EnterResultsClientProps) {
  const [selectedYear, setSelectedYear] = useState<string>(
    academicYears.find((y) => y.isCurrent)?.id || ""
  );
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [examSubjects, setExamSubjects] = useState<ExamSubject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<Record<string, { marks: string; remarks: string }>>({});
  const [existingResults, setExistingResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedYear) {
      fetchExams();
    }
  }, [selectedYear]);

  useEffect(() => {
    if (selectedExam) {
      fetchExamSubjects();
    } else {
      setExamSubjects([]);
      setSelectedSubject("");
    }
  }, [selectedExam]);

  useEffect(() => {
    if (selectedSubject) {
      fetchStudentsAndResults();
    } else {
      setStudents([]);
      setResults({});
    }
  }, [selectedSubject]);

  const fetchExams = async () => {
    try {
      const params = new URLSearchParams();
      params.append("academicYearId", selectedYear);

      const res = await fetch(`/api/exams?${params}`);
      if (res.ok) {
        const data = await res.json();
        setExams(data.data);
        setSelectedExam("");
        setExamSubjects([]);
        setSelectedSubject("");
      }
    } catch (error) {
      console.error("Failed to fetch exams:", error);
      toast.error("Failed to load exams");
    }
  };

  const fetchExamSubjects = async () => {
    try {
      const res = await fetch(`/api/exams/${selectedExam}/subjects`);
      if (res.ok) {
        const data = await res.json();
        setExamSubjects(data);
        setSelectedSubject("");
      }
    } catch (error) {
      toast.error("Failed to load exam subjects");
    }
  };

  const fetchStudentsAndResults = async () => {
    setLoading(true);
    try {
      // Get the selected exam subject to find section
      const examSubject = examSubjects.find((es) => es.id === selectedSubject);
      if (!examSubject) return;

      // Fetch students in the section
      const studentsRes = await fetch(`/api/students?sectionId=${examSubject.section.id}`);
      if (studentsRes.ok) {
        const data = await studentsRes.json();
        setStudents(data.data || []);
      } else {
        console.error("Failed to fetch students:", studentsRes.status);
        toast.error("Failed to load students");
      }

      // Fetch existing results
      const resultsRes = await fetch(`/api/exams/${selectedExam}/results?examSubjectId=${selectedSubject}`);
      if (resultsRes.ok) {
        const data = await resultsRes.json();
        console.log("Fetched results:", data);
        setExistingResults(data);

        // Initialize results state with existing data
        const initialResults: Record<string, { marks: string; remarks: string }> = {};
        data.forEach((r: Result) => {
          initialResults[r.studentId] = {
            marks: r.marksObtained?.toString() ?? "",
            remarks: r.remarks ?? "",
          };
        });
        console.log("Initial results state:", initialResults);
        setResults(initialResults);
      } else {
        console.error("Failed to fetch results:", resultsRes.status);
        toast.error("Failed to load existing results");
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleMarksChange = (studentId: string, marks: string) => {
    // Validate numeric input
    if (marks && !/^\d*\.?\d*$/.test(marks)) return;

    setResults((prev) => ({
      ...prev,
      [studentId]: {
        marks,
        remarks: prev[studentId]?.remarks || "",
      },
    }));
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setResults((prev) => ({
      ...prev,
      [studentId]: {
        marks: prev[studentId]?.marks || "",
        remarks,
      },
    }));
  };

  const handleSaveResults = async () => {
    const examSubject = examSubjects.find((es) => es.id === selectedSubject);
    if (!examSubject) {
      toast.error("Please select a subject first");
      return;
    }

    // Validate marks
    const invalidMarks = Object.entries(results).filter(([_, data]) => {
      if (!data.marks) return false;
      const marks = parseFloat(data.marks);
      return isNaN(marks) || marks < 0 || marks > examSubject.maxMarks;
    });

    if (invalidMarks.length > 0) {
      toast.error(`Invalid marks detected. Marks must be between 0 and ${examSubject.maxMarks}`);
      return;
    }

    // Prepare results data
    const resultsData = Object.entries(results)
      .filter(([_, data]) => data.marks !== "")
      .map(([studentId, data]) => ({
        studentId,
        marksObtained: parseFloat(data.marks),
        remarks: data.remarks || undefined,
      }));

    if (resultsData.length === 0) {
      toast.error("No marks entered");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/exams/${selectedExam}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examSubjectId: selectedSubject,
          results: resultsData,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log("Save results response:", data);
        toast.success("Results saved successfully");
        fetchStudentsAndResults();
      } else {
        const error = await res.json();
        console.error("Save results error:", error);
        toast.error(error.error || "Failed to save results");
      }
    } catch (error) {
      console.error("Save results error:", error);
      toast.error("Failed to save results");
    } finally {
      setSaving(false);
    }
  };

  const getStudentResult = (studentId: string) => {
    return existingResults.find((r) => r.studentId === studentId);
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A+":
      case "A":
        return "bg-green-100 text-green-800";
      case "B+":
      case "B":
        return "bg-blue-100 text-blue-800";
      case "C":
        return "bg-yellow-100 text-yellow-800";
      case "D":
        return "bg-orange-100 text-orange-800";
      case "F":
        return "bg-red-100 text-red-800";
      default:
        return "";
    }
  };

  const selectedExamData = exams.find((e) => e.id === selectedExam);
  const selectedSubjectData = examSubjects.find((es) => es.id === selectedSubject);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Exam and Subject</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Academic Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((year) => (
                    <SelectItem key={year.id} value={year.id}>
                      {year.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Exam</Label>
              <Select value={selectedExam} onValueChange={setSelectedExam}>
                <SelectTrigger>
                  <SelectValue placeholder="Select exam" />
                </SelectTrigger>
                <SelectContent>
                  {exams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Subject & Section</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {examSubjects.map((es) => (
                    <SelectItem key={es.id} value={es.id}>
                      {es.subject?.name ?? "N/A"} - {es.section?.class?.name ?? "N/A"} {es.section?.name ?? "N/A"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSubjectData && (
              <div className="space-y-2">
                <Label>Exam Details</Label>
                <div className="text-sm text-muted-foreground">
                  <div>Max Marks: {selectedSubjectData.maxMarks}</div>
                  <div>Pass Mark: {selectedSubjectData.passMark}</div>
                  <div>Date: {format(new Date(selectedSubjectData.examDate), "MMM d, yyyy")}</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedSubject && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">
              Enter Marks
              {selectedSubjectData && (
                <span className="text-muted-foreground font-normal ml-2">
                  ({selectedSubjectData.subject?.name ?? "N/A"} - {selectedSubjectData.section?.class?.name ?? "N/A"} {selectedSubjectData.section?.name ?? "N/A"})
                </span>
              )}
            </CardTitle>
            {selectedExamData?.isPublished && (
              <Badge variant="default">Results Published</Badge>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading students...</div>
            ) : students.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No students found in this section.
              </div>
            ) : (
              <>
                <div className="mb-4 flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    {students.length} students • {existingResults.length} results entered
                  </div>
                  <Button onClick={handleSaveResults} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Saving..." : "Save Results"}
                  </Button>
                </div>

                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">S.No</TableHead>
                        <TableHead>Student ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="w-[120px]">Marks</TableHead>
                        <TableHead className="w-[100px]">Grade</TableHead>
                        <TableHead>Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student, idx) => {
                        const existingResult = getStudentResult(student.id);
                        const currentMarks = results[student.id]?.marks ?? "";

                        return (
                          <TableRow key={student.id}>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell className="font-mono">{student.studentId}</TableCell>
                            <TableCell className="font-medium">
                              {student.firstName} {student.lastName}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                inputMode="decimal"
                                value={currentMarks}
                                onChange={(e) => handleMarksChange(student.id, e.target.value)}
                                placeholder={`0-${selectedSubjectData?.maxMarks}`}
                                className="w-24"
                                disabled={selectedExamData?.isPublished}
                              />
                            </TableCell>
                            <TableCell>
                              {existingResult?.grade && (
                                <Badge className={getGradeColor(existingResult.grade)}>
                                  {existingResult.grade}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Input
                                value={results[student.id]?.remarks ?? ""}
                                onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                                placeholder="Optional remarks"
                                disabled={selectedExamData?.isPublished}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
