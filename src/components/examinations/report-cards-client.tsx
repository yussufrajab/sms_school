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
import { Printer, Download, User } from "lucide-react";

type AcademicYear = { id: string; name: string; isCurrent: boolean };
type Section = { id: string; name: string; class: { id: string; name: string; level: number } };

type Exam = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isPublished: boolean;
};

type ReportCard = {
  student: {
    id: string;
    studentId: string;
    firstName: string;
    lastName: string;
    section: {
      id: string;
      name: string;
      class: { id: string; name: string };
    };
  };
  exam: {
    id: string;
    name: string;
    academicYear: { id: string; name: string };
    term?: { id: string; name: string } | null;
  };
  subjects: Array<{
    subject: { id: string; name: string; code: string };
    maxMarks: number;
    passMark: number;
    marksObtained: number | null;
    grade: string | null;
    status: string;
  }>;
  summary: {
    totalMarks: number;
    totalMaxMarks: number;
    percentage: string;
    overallGrade: string;
    passed: number;
    failed: number;
    status: string;
    rank: number;
  };
};

interface ReportCardsClientProps {
  academicYears: AcademicYear[];
  sections: Section[];
}

export function ReportCardsClient({ academicYears, sections }: ReportCardsClientProps) {
  const [selectedYear, setSelectedYear] = useState<string>(
    academicYears.find((y) => y.isCurrent)?.id || ""
  );
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<ReportCard | null>(null);

  useEffect(() => {
    if (selectedYear) {
      fetchExams();
    }
  }, [selectedYear]);

  useEffect(() => {
    if (selectedExam && selectedSection) {
      fetchReportCards();
    } else {
      setReportCards([]);
    }
  }, [selectedExam, selectedSection]);

  const fetchExams = async () => {
    try {
      const params = new URLSearchParams();
      params.append("academicYearId", selectedYear);

      const res = await fetch(`/api/exams?${params}`);
      if (res.ok) {
        const data = await res.json();
        setExams(data.data);
        setSelectedExam("");
      }
    } catch (error) {
      console.error("Failed to fetch exams:", error);
      toast.error("Failed to load exams");
    }
  };

  const fetchReportCards = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("sectionId", selectedSection);

      const res = await fetch(`/api/exams/${selectedExam}/report?${params}`);
      if (res.ok) {
        const data = await res.json();
        setReportCards(data.reportCards || []);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to load report cards");
        setReportCards([]);
      }
    } catch (error) {
      toast.error("Failed to load report cards");
      setReportCards([]);
    } finally {
      setLoading(false);
    }
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
        return "bg-gray-100 text-gray-800";
    }
  };

  const handlePrint = (card: ReportCard) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Report Card - ${card.student.firstName} ${card.student.lastName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .school-name { font-size: 24px; font-weight: bold; }
          .report-title { font-size: 18px; margin-top: 10px; }
          .student-info { margin-bottom: 20px; }
          .student-info table { width: 100%; }
          .student-info td { padding: 5px 0; }
          .student-info td:first-child { font-weight: bold; width: 150px; }
          table.results { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          table.results th, table.results td { border: 1px solid #333; padding: 8px; text-align: left; }
          table.results th { background: #f0f0f0; }
          table.results td:nth-child(3), table.results td:nth-child(4) { text-align: center; }
          .summary { margin-top: 20px; }
          .summary table { width: 100%; }
          .summary td { padding: 5px 0; }
          .summary td:first-child { font-weight: bold; width: 150px; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; }
          .signature { text-align: center; }
          .signature-line { border-top: 1px solid #333; width: 200px; margin-top: 40px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="school-name">Springfield International School</div>
          <div class="report-title">Academic Report Card</div>
          <div>${card.exam.academicYear.name} ${card.exam.term ? `- ${card.exam.term.name}` : ""}</div>
        </div>
        
        <div class="student-info">
          <table>
            <tr><td>Student Name:</td><td>${card.student.firstName} ${card.student.lastName}</td></tr>
            <tr><td>Student ID:</td><td>${card.student.studentId}</td></tr>
            <tr><td>Class:</td><td>${card.student.section?.class?.name ?? "N/A"} - ${card.student.section?.name ?? "N/A"}</td></tr>
            <tr><td>Exam:</td><td>${card.exam.name}</td></tr>
          </table>
        </div>
        
        <table class="results">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Max Marks</th>
              <th>Marks Obtained</th>
              <th>Grade</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${card.subjects.map((s) => `
              <tr>
                <td>${s.subject.name}</td>
                <td style="text-align: center;">${s.maxMarks}</td>
                <td style="text-align: center;">${s.marksObtained ?? "AB"}</td>
                <td style="text-align: center;">${s.grade ?? "-"}</td>
                <td style="text-align: center;">${s.status}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        
        <div class="summary">
          <table>
            <tr><td>Total Marks:</td><td>${card.summary.totalMarks} / ${card.summary.totalMaxMarks}</td></tr>
            <tr><td>Percentage:</td><td>${card.summary.percentage}%</td></tr>
            <tr><td>Overall Grade:</td><td>${card.summary.overallGrade}</td></tr>
            <tr><td>Rank:</td><td>${card.summary.rank}</td></tr>
            <tr><td>Status:</td><td>${card.summary.status}</td></tr>
          </table>
        </div>
        
        <div class="footer">
          <div class="signature">
            <div class="signature-line">Class Teacher</div>
          </div>
          <div class="signature">
            <div class="signature-line">Principal</div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const selectedExamData = exams.find((e) => e.id === selectedExam);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Generate Report Cards</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Academic Year</label>
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
              <label className="text-sm font-medium">Exam</label>
              <Select value={selectedExam} onValueChange={setSelectedExam}>
                <SelectTrigger>
                  <SelectValue placeholder="Select exam" />
                </SelectTrigger>
                <SelectContent>
                  {exams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.name}
                      {!exam.isPublished && " (Draft)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Section</label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
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
          </div>
        </CardContent>
      </Card>

      {selectedExam && selectedSection && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">
              Report Cards
              {selectedExamData && (
                <span className="text-muted-foreground font-normal ml-2">
                  - {selectedExamData.name}
                </span>
              )}
            </CardTitle>
            {selectedExamData && !selectedExamData.isPublished && (
              <Badge variant="outline">Results not published</Badge>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading report cards...</div>
            ) : reportCards.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No report cards found. Make sure results have been entered for this exam.
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Rank</TableHead>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-center">Percentage</TableHead>
                      <TableHead className="text-center">Grade</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportCards.map((card) => (
                      <TableRow key={card.student.id}>
                        <TableCell className="font-medium">#{card.summary.rank}</TableCell>
                        <TableCell className="font-mono">{card.student.studentId}</TableCell>
                        <TableCell>
                          {card.student.firstName} {card.student.lastName}
                        </TableCell>
                        <TableCell className="text-center">{card.summary.percentage}%</TableCell>
                        <TableCell className="text-center">
                          <Badge className={getGradeColor(card.summary.overallGrade)}>
                            {card.summary.overallGrade}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={card.summary.status === "PASS" ? "default" : "destructive"}>
                            {card.summary.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePrint(card)}
                          >
                            <Printer className="h-4 w-4 mr-1" />
                            Print
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Individual Report Card View */}
      {selectedStudent && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">
              <User className="h-5 w-5 inline mr-2" />
              {selectedStudent.student.firstName} {selectedStudent.student.lastName}
            </CardTitle>
            <Button variant="outline" onClick={() => setSelectedStudent(null)}>
              Close
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <div className="text-sm text-muted-foreground">Student ID</div>
                <div className="font-mono">{selectedStudent.student.studentId}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Class</div>
                <div>{selectedStudent.student.section?.class?.name ?? "N/A"} - {selectedStudent.student.section?.name ?? "N/A"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Percentage</div>
                <div className="text-xl font-bold">{selectedStudent.summary.percentage}%</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Rank</div>
                <div className="text-xl font-bold">#{selectedStudent.summary.rank}</div>
              </div>
            </div>

            <div className="border rounded-lg mb-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead className="text-center">Max Marks</TableHead>
                    <TableHead className="text-center">Marks</TableHead>
                    <TableHead className="text-center">Grade</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedStudent.subjects.map((s) => (
                    <TableRow key={s.subject.id}>
                      <TableCell className="font-medium">{s.subject.name}</TableCell>
                      <TableCell className="text-center">{s.maxMarks}</TableCell>
                      <TableCell className="text-center">
                        {s.marksObtained ?? <span className="text-muted-foreground">AB</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        {s.grade && (
                          <Badge className={getGradeColor(s.grade)}>{s.grade}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={s.status === "PASS" ? "default" : "destructive"}>
                          {s.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => handlePrint(selectedStudent)}>
                <Printer className="h-4 w-4 mr-2" />
                Print Report Card
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
