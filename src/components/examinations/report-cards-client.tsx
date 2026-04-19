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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Printer, Download, User, Search } from "lucide-react";

type AcademicYear = { id: string; name: string; isCurrent: boolean };
type Term = { id: string; name: string };
type Section = { id: string; name: string; class: { id: string; name: string; level: number } };

type Exam = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isPublished: boolean;
  academicYear: { id: string; name: string };
  term?: { id: string; name: string } | null;
};

type Student = {
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

type TermReport = {
  student: Student;
  academicYear: { id: string; name: string };
  term: { id: string; name: string };
  exams: Array<{
    id: string;
    name: string;
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
    };
  }>;
  overallSummary: {
    totalMarks: number;
    totalMaxMarks: number;
    averagePercentage: string;
    overallGrade: string;
    totalPassed: number;
    totalFailed: number;
    rank?: number;
  };
};

type ClassReport = {
  section: { id: string; name: string; class: { id: string; name: string; level: number } };
  academicYear: { id: string; name: string };
  term: { id: string; name: string };
  students: Array<TermReport>;
  classStats: {
    totalStudents: number;
    averagePercentage: string;
    gradeDistribution: Record<string, number>;
    passCount: number;
    failCount: number;
  };
};

interface ReportCardsClientProps {
  academicYears: AcademicYear[];
  terms: Term[];
  sections: Section[];
}

export function ReportCardsClient({ academicYears, terms: initialTerms = [], sections }: ReportCardsClientProps) {
  const [selectedYear, setSelectedYear] = useState<string>(
    academicYears.find((y) => y.isCurrent)?.id || ""
  );
  const [terms, setTerms] = useState<Term[]>(initialTerms);
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<ReportCard | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");

  // Student report state
  const [showStudentReport, setShowStudentReport] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [termReport, setTermReport] = useState<TermReport | null>(null);
  const [loadingStudentReport, setLoadingStudentReport] = useState(false);

  // Class report state
  const [showClassReport, setShowClassReport] = useState(false);
  const [classTerm, setClassTerm] = useState<string>("");
  const [classSection, setClassSection] = useState<string>("");
  const [classReport, setClassReport] = useState<ClassReport | null>(null);
  const [loadingClassReport, setLoadingClassReport] = useState(false);

  useEffect(() => {
    if (selectedYear) {
      fetchExams();
      fetchTerms();
    }
  }, [selectedYear]);

  useEffect(() => {
    if (selectedExam && selectedSection) {
      fetchReportCards();
    } else {
      setReportCards([]);
    }
  }, [selectedExam, selectedSection]);

  useEffect(() => {
    if (selectedSection) {
      fetchStudents();
    }
  }, [selectedSection]);

  const fetchTerms = async () => {
    try {
      const res = await fetch(`/api/terms?academicYearId=${selectedYear}`);
      if (res.ok) {
        const data = await res.json();
        setTerms(data);
        setSelectedTerm("");
      }
    } catch (error) {
      console.error("Failed to fetch terms:", error);
    }
  };

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

  const fetchStudents = async () => {
    try {
      const res = await fetch(`/api/students?sectionId=${selectedSection}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch students:", error);
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

  const fetchTermReport = async () => {
    if (!selectedStudentId || !selectedYear || !selectedTerm) {
      toast.error("Please select academic year, term, and student");
      return;
    }

    setLoadingStudentReport(true);
    try {
      const params = new URLSearchParams();
      params.append("studentId", selectedStudentId);
      params.append("academicYearId", selectedYear);
      params.append("termId", selectedTerm);

      const res = await fetch(`/api/exams/term-report?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTermReport(data);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to load term report");
        setTermReport(null);
      }
    } catch (error) {
      toast.error("Failed to load term report");
      setTermReport(null);
    } finally {
      setLoadingStudentReport(false);
    }
  };

  const fetchClassReport = async () => {
    if (!classSection || !selectedYear || !classTerm) {
      toast.error("Please select academic year, term, and section");
      return;
    }

    setLoadingClassReport(true);
    try {
      const params = new URLSearchParams();
      params.append("sectionId", classSection);
      params.append("academicYearId", selectedYear);
      params.append("termId", classTerm);

      const res = await fetch(`/api/exams/term-report?${params}`);
      if (res.ok) {
        const data = await res.json();
        setClassReport(data);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to load class report");
        setClassReport(null);
      }
    } catch (error) {
      toast.error("Failed to load class report");
      setClassReport(null);
    } finally {
      setLoadingClassReport(false);
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

  const handlePrintAllReportCards = () => {
    if (!reportCards.length || !selectedExamData) return;

    const selectedSectionData = sections.find((s) => s.id === selectedSection);

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Calculate class statistics
    const totalStudents = reportCards.length;
    const avgPercentage = (reportCards.reduce((sum, c) => sum + parseFloat(c.summary.percentage), 0) / totalStudents).toFixed(2);
    const passCount = reportCards.filter((c) => c.summary.status === "PASS").length;
    const failCount = reportCards.filter((c) => c.summary.status === "FAIL").length;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Class Exam Results - ${selectedExamData.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 1100px; margin: 0 auto; font-size: 11px; }
          .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .school-name { font-size: 20px; font-weight: bold; }
          .report-title { font-size: 16px; margin-top: 5px; }
          .exam-info { font-size: 12px; color: #666; margin-top: 3px; }
          .class-stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 15px 0; padding: 10px; background: #f5f5f5; border-radius: 4px; }
          .stat-item { text-align: center; }
          .stat-value { font-size: 18px; font-weight: bold; }
          .stat-label { font-size: 10px; color: #666; }
          table.results { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          table.results th, table.results td { border: 1px solid #333; padding: 6px; text-align: left; }
          table.results th { background: #f0f0f0; }
          table.results td:nth-child(1) { width: 40px; text-align: center; }
          table.results td:nth-child(4), table.results td:nth-child(5) { text-align: center; }
          .grade-a { background: #d4edda; }
          .grade-b { background: #cce5ff; }
          .grade-c { background: #fff3cd; }
          .grade-d { background: #ffe5d0; }
          .grade-f { background: #f8d7da; }
          .footer { margin-top: 20px; display: flex; justify-content: space-between; }
          .signature { text-align: center; }
          .signature-line { border-top: 1px solid #333; width: 180px; margin-top: 30px; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="school-name">Springfield International School</div>
          <div class="report-title">Class Exam Results</div>
          <div class="exam-info">${selectedExamData.name} | ${selectedExamData.academicYear.name} ${selectedExamData.term ? `- ${selectedExamData.term.name}` : ""} | ${selectedSectionData?.class.name ?? ""} - ${selectedSectionData?.name ?? ""}</div>
        </div>

        <div class="class-stats">
          <div class="stat-item">
            <div class="stat-value">${totalStudents}</div>
            <div class="stat-label">Students</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${avgPercentage}%</div>
            <div class="stat-label">Class Average</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${passCount}</div>
            <div class="stat-label">Passed</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${failCount}</div>
            <div class="stat-label">Failed</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${((passCount / totalStudents) * 100).toFixed(0)}%</div>
            <div class="stat-label">Pass Rate</div>
          </div>
        </div>

        <table class="results">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Student ID</th>
              <th>Name</th>
              <th>Percentage</th>
              <th>Grade</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${reportCards.map((card) => `
              <tr class="${card.summary.overallGrade.startsWith("A") ? "grade-a" : card.summary.overallGrade.startsWith("B") ? "grade-b" : card.summary.overallGrade === "C" ? "grade-c" : card.summary.overallGrade === "D" ? "grade-d" : "grade-f"}">
                <td>#${card.summary.rank}</td>
                <td>${card.student.studentId}</td>
                <td>${card.student.firstName} ${card.student.lastName}</td>
                <td>${card.summary.percentage}%</td>
                <td>${card.summary.overallGrade}</td>
                <td>${card.summary.status}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

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

  // Get unique subjects from report cards
  const allSubjects = reportCards.length > 0
    ? Array.from(new Map(
        reportCards[0]?.subjects.map(s => [s.subject.id, s.subject]) || []
      ).values())
    : [];

  // Compute subject-specific results when a subject is selected
  const subjectResults = selectedSubjectId && reportCards.length > 0
    ? reportCards.map(card => {
        const subjectData = card.subjects.find(s => s.subject.id === selectedSubjectId);
        return {
          student: card.student,
          subject: subjectData?.subject,
          maxMarks: subjectData?.maxMarks ?? 0,
          marksObtained: subjectData?.marksObtained,
          grade: subjectData?.grade,
          status: subjectData?.status ?? "ABSENT",
        };
      }).sort((a, b) => (b.marksObtained ?? -1) - (a.marksObtained ?? -1)).map((item, idx) => ({
        ...item,
        rank: idx + 1,
      }))
    : null;

  // Print subject-specific results
  const handlePrintSubjectResults = () => {
    if (!subjectResults || !selectedExamData) return;

    const selectedSubject = allSubjects.find(s => s.id === selectedSubjectId);
    const selectedSectionData = sections.find((s) => s.id === selectedSection);

    const totalStudents = subjectResults.length;
    const presentCount = subjectResults.filter(r => r.marksObtained !== null).length;
    const avgMarks = subjectResults.length > 0
      ? (subjectResults.reduce((sum, r) => sum + (r.marksObtained ?? 0), 0) / presentCount).toFixed(2)
      : "0";
    const passCount = subjectResults.filter(r => r.status === "PASS").length;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Subject Results - ${selectedSubject?.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 900px; margin: 0 auto; font-size: 12px; }
          .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .school-name { font-size: 20px; font-weight: bold; }
          .report-title { font-size: 16px; margin-top: 5px; }
          .exam-info { font-size: 12px; color: #666; margin-top: 3px; }
          .subject-name { font-size: 14px; font-weight: bold; margin-top: 5px; }
          .class-stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 15px 0; padding: 10px; background: #f5f5f5; border-radius: 4px; }
          .stat-item { text-align: center; }
          .stat-value { font-size: 18px; font-weight: bold; }
          .stat-label { font-size: 10px; color: #666; }
          table.results { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          table.results th, table.results td { border: 1px solid #333; padding: 6px; text-align: left; }
          table.results th { background: #f0f0f0; }
          table.results td:nth-child(1) { width: 40px; text-align: center; }
          table.results td:nth-child(4), table.results td:nth-child(5), table.results td:nth-child(6) { text-align: center; }
          .grade-a { background: #d4edda; }
          .grade-b { background: #cce5ff; }
          .grade-c { background: #fff3cd; }
          .grade-d { background: #ffe5d0; }
          .grade-f { background: #f8d7da; }
          .footer { margin-top: 20px; display: flex; justify-content: space-between; }
          .signature { text-align: center; }
          .signature-line { border-top: 1px solid #333; width: 180px; margin-top: 30px; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="school-name">Springfield International School</div>
          <div class="report-title">Subject Results</div>
          <div class="subject-name">${selectedSubject?.name ?? "Unknown Subject"}</div>
          <div class="exam-info">${selectedExamData.name} | ${selectedExamData.academicYear.name} ${selectedExamData.term ? `- ${selectedExamData.term.name}` : ""} | ${selectedSectionData?.class.name ?? ""} - ${selectedSectionData?.name ?? ""}</div>
        </div>

        <div class="class-stats">
          <div class="stat-item">
            <div class="stat-value">${totalStudents}</div>
            <div class="stat-label">Students</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${subjectResults[0]?.maxMarks ?? 100}</div>
            <div class="stat-label">Max Marks</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${avgMarks}</div>
            <div class="stat-label">Average</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${passCount}</div>
            <div class="stat-label">Passed</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${((passCount / totalStudents) * 100).toFixed(0)}%</div>
            <div class="stat-label">Pass Rate</div>
          </div>
        </div>

        <table class="results">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Student ID</th>
              <th>Name</th>
              <th>Marks</th>
              <th>Grade</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${subjectResults.map((r) => `
              <tr class="${r.grade?.startsWith("A") ? "grade-a" : r.grade?.startsWith("B") ? "grade-b" : r.grade === "C" ? "grade-c" : r.grade === "D" ? "grade-d" : r.grade === "F" ? "grade-f" : ""}">
                <td>#${r.rank}</td>
                <td>${r.student.studentId}</td>
                <td>${r.student.firstName} ${r.student.lastName}</td>
                <td>${r.marksObtained ?? "AB"}</td>
                <td>${r.grade ?? "-"}</td>
                <td>${r.status}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <div class="footer">
          <div class="signature">
            <div class="signature-line">Subject Teacher</div>
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

  // Print detailed class results with all subjects as columns
  const handlePrintDetailedClassResults = () => {
    if (!reportCards.length || !selectedExamData) return;

    const selectedSectionData = sections.find((s) => s.id === selectedSection);
    const subjects = allSubjects;

    // Calculate class statistics
    const totalStudents = reportCards.length;
    const avgPercentage = (reportCards.reduce((sum, c) => sum + parseFloat(c.summary.percentage), 0) / totalStudents).toFixed(2);
    const passCount = reportCards.filter((c) => c.summary.status === "PASS").length;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Class Results - ${selectedSectionData?.class.name ?? ""} ${selectedSectionData?.name ?? ""}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 15px; max-width: 100%; margin: 0 auto; font-size: 10px; }
          .header { text-align: center; margin-bottom: 10px; border-bottom: 2px solid #333; padding-bottom: 8px; }
          .school-name { font-size: 18px; font-weight: bold; }
          .class-info { font-size: 14px; margin-top: 5px; }
          .exam-info { font-size: 11px; color: #666; margin-top: 3px; }
          .stats { display: flex; gap: 20px; margin: 10px 0; padding: 8px; background: #f5f5f5; border-radius: 4px; }
          .stat { text-align: center; }
          .stat-value { font-size: 14px; font-weight: bold; }
          .stat-label { font-size: 9px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          th, td { border: 1px solid #333; padding: 4px 2px; text-align: center; font-size: 9px; }
          th { background: #f0f0f0; font-weight: bold; }
          td.name { text-align: left; font-weight: 500; min-width: 100px; }
          td.marks { min-width: 35px; }
          .grade-a { background: #d4edda; }
          .grade-b { background: #cce5ff; }
          .grade-c { background: #fff3cd; }
          .grade-d { background: #ffe5d0; }
          .grade-f { background: #f8d7da; }
          .footer { margin-top: 15px; display: flex; justify-content: space-between; }
          .signature { text-align: center; }
          .signature-line { border-top: 1px solid #333; width: 150px; margin-top: 25px; font-size: 9px; }
          @media print { body { padding: 5px; } @page { size: landscape; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="school-name">Springfield International School</div>
          <div class="class-info">${selectedSectionData?.class.name ?? ""} - ${selectedSectionData?.name ?? ""}</div>
          <div class="exam-info">${selectedExamData.name} | ${selectedExamData.academicYear.name} ${selectedExamData.term ? `- ${selectedExamData.term.name}` : ""}</div>
        </div>

        <div class="stats">
          <div class="stat">
            <div class="stat-value">${totalStudents}</div>
            <div class="stat-label">Students</div>
          </div>
          <div class="stat">
            <div class="stat-value">${avgPercentage}%</div>
            <div class="stat-label">Avg</div>
          </div>
          <div class="stat">
            <div class="stat-value">${passCount}</div>
            <div class="stat-label">Passed</div>
          </div>
          <div class="stat">
            <div class="stat-value">${totalStudents - passCount}</div>
            <div class="stat-label">Failed</div>
          </div>
          <div class="stat">
            <div class="stat-value">${((passCount / totalStudents) * 100).toFixed(0)}%</div>
            <div class="stat-label">Pass Rate</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px;">#</th>
              <th style="min-width: 100px;">Student Name</th>
              ${subjects.map(s => `<th style="min-width: 40px;">${s.code || s.name.substring(0, 3)}</th>`).join("")}
              <th>Total</th>
              <th>Avg%</th>
              <th>Grade</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${reportCards.map((card, idx) => `
              <tr class="${card.summary.overallGrade.startsWith("A") ? "grade-a" : card.summary.overallGrade.startsWith("B") ? "grade-b" : card.summary.overallGrade === "C" ? "grade-c" : card.summary.overallGrade === "D" ? "grade-d" : "grade-f"}">
                <td>${idx + 1}</td>
                <td class="name">${card.student.firstName} ${card.student.lastName}</td>
                ${subjects.map(s => {
                  const subj = card.subjects.find(sub => sub.subject.id === s.id);
                  return `<td class="marks">${subj?.marksObtained ?? "-"}</td>`;
                }).join("")}
                <td class="marks">${card.summary.totalMarks}/${card.summary.totalMaxMarks}</td>
                <td class="marks">${card.summary.percentage}</td>
                <td class="marks">${card.summary.overallGrade}</td>
                <td class="marks">${card.summary.status}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

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

  const handlePrintTermReport = () => {
    if (!termReport) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Term Report - ${termReport.student.firstName} ${termReport.student.lastName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
          .school-name { font-size: 24px; font-weight: bold; }
          .report-title { font-size: 18px; margin-top: 8px; }
          .term-info { font-size: 14px; color: #666; margin-top: 5px; }
          .student-info { margin-bottom: 15px; }
          .student-info table { width: 100%; }
          .student-info td { padding: 4px 0; }
          .student-info td:first-child { font-weight: bold; width: 140px; }
          .exam-section { margin-bottom: 20px; }
          .exam-title { font-size: 14px; font-weight: bold; background: #f5f5f5; padding: 8px; margin-bottom: 8px; }
          table.results { width: 100%; border-collapse: collapse; font-size: 12px; }
          table.results th, table.results td { border: 1px solid #333; padding: 6px; text-align: left; }
          table.results th { background: #f0f0f0; }
          table.results td:nth-child(3), table.results td:nth-child(4), table.results td:nth-child(5) { text-align: center; }
          .overall-summary { margin-top: 20px; border: 2px solid #333; padding: 15px; }
          .overall-summary h3 { margin: 0 0 10px 0; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
          .summary-item { text-align: center; }
          .summary-value { font-size: 20px; font-weight: bold; }
          .summary-label { font-size: 12px; color: #666; }
          .footer { margin-top: 30px; display: flex; justify-content: space-between; }
          .signature { text-align: center; }
          .signature-line { border-top: 1px solid #333; width: 180px; margin-top: 40px; }
          @media print { body { padding: 15px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="school-name">Springfield International School</div>
          <div class="report-title">Term Report Card</div>
          <div class="term-info">${termReport.academicYear.name} - ${termReport.term.name}</div>
        </div>

        <div class="student-info">
          <table>
            <tr><td>Student Name:</td><td>${termReport.student.firstName} ${termReport.student.lastName}</td></tr>
            <tr><td>Student ID:</td><td>${termReport.student.studentId}</td></tr>
            <tr><td>Class:</td><td>${termReport.student.section?.class?.name ?? "N/A"} - ${termReport.student.section?.name ?? "N/A"}</td></tr>
          </table>
        </div>

        ${termReport.exams.map((exam) => `
          <div class="exam-section">
            <div class="exam-title">${exam.name} (${exam.summary.percentage}% - ${exam.summary.overallGrade})</div>
            <table class="results">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Max Marks</th>
                  <th>Marks</th>
                  <th>Grade</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${exam.subjects.map((s) => `
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
          </div>
        `).join("")}

        <div class="overall-summary">
          <h3>Term Summary</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-value">${termReport.overallSummary.totalMarks}/${termReport.overallSummary.totalMaxMarks}</div>
              <div class="summary-label">Total Marks</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${termReport.overallSummary.averagePercentage}%</div>
              <div class="summary-label">Average</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${termReport.overallSummary.overallGrade}</div>
              <div class="summary-label">Overall Grade</div>
            </div>
          </div>
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

  const filteredStudents = students.filter(
    (s) =>
      studentSearch === "" ||
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.studentId.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const selectedExamData = exams.find((e) => e.id === selectedExam);

  const handlePrintClassReport = () => {
    if (!classReport) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Class Term Report - ${classReport.section.class.name} ${classReport.section.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 1100px; margin: 0 auto; font-size: 11px; }
          .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .school-name { font-size: 20px; font-weight: bold; }
          .report-title { font-size: 16px; margin-top: 5px; }
          .term-info { font-size: 12px; color: #666; margin-top: 3px; }
          .class-stats { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin: 15px 0; padding: 10px; background: #f5f5f5; border-radius: 4px; }
          .stat-item { text-align: center; }
          .stat-value { font-size: 18px; font-weight: bold; }
          .stat-label { font-size: 10px; color: #666; }
          table.results { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          table.results th, table.results td { border: 1px solid #333; padding: 5px; text-align: left; }
          table.results th { background: #f0f0f0; }
          table.results td:nth-child(1) { width: 30px; text-align: center; }
          table.results td:nth-child(4), table.results td:nth-child(5) { text-align: center; }
          .grade-a { background: #d4edda; }
          .grade-b { background: #cce5ff; }
          .grade-c { background: #fff3cd; }
          .grade-d { background: #ffe5d0; }
          .grade-f { background: #f8d7da; }
          .footer { margin-top: 20px; display: flex; justify-content: space-between; }
          .signature { text-align: center; }
          .signature-line { border-top: 1px solid #333; width: 180px; margin-top: 30px; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="school-name">Springfield International School</div>
          <div class="report-title">Class Term Report</div>
          <div class="term-info">${classReport.academicYear.name} - ${classReport.term.name} | ${classReport.section.class.name} - ${classReport.section.name}</div>
        </div>

        <div class="class-stats">
          <div class="stat-item">
            <div class="stat-value">${classReport.classStats.totalStudents}</div>
            <div class="stat-label">Students</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${classReport.classStats.averagePercentage}%</div>
            <div class="stat-label">Class Average</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${classReport.classStats.passCount}</div>
            <div class="stat-label">Passed</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${classReport.classStats.failCount}</div>
            <div class="stat-label">Failed</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${classReport.classStats.gradeDistribution["A+"] + classReport.classStats.gradeDistribution["A"]}</div>
            <div class="stat-label">A Grades</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${classReport.classStats.gradeDistribution["F"]}</div>
            <div class="stat-label">F Grades</div>
          </div>
        </div>

        <table class="results">
          <thead>
            <tr>
              <th>#</th>
              <th>Student ID</th>
              <th>Name</th>
              <th>Marks</th>
              <th>Percentage</th>
              <th>Grade</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${classReport.students.map((s) => `
              <tr class="${s.overallSummary.overallGrade.startsWith("A") ? "grade-a" : s.overallSummary.overallGrade.startsWith("B") ? "grade-b" : s.overallSummary.overallGrade === "C" ? "grade-c" : s.overallSummary.overallGrade === "D" ? "grade-d" : s.overallSummary.overallGrade === "F" ? "grade-f" : ""}">
                <td>${s.overallSummary.rank}</td>
                <td>${s.student.studentId}</td>
                <td>${s.student.firstName} ${s.student.lastName}</td>
                <td>${s.overallSummary.totalMarks}/${s.overallSummary.totalMaxMarks}</td>
                <td>${s.overallSummary.averagePercentage}%</td>
                <td>${s.overallSummary.overallGrade}</td>
                <td>${s.overallSummary.totalFailed === 0 && s.overallSummary.totalPassed > 0 ? "PASS" : "FAIL"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

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

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={!showStudentReport && !showClassReport ? "default" : "outline"}
          onClick={() => {
            setShowStudentReport(false);
            setShowClassReport(false);
          }}
        >
          Exam Reports
        </Button>
        <Button
          variant={showStudentReport ? "default" : "outline"}
          onClick={() => {
            setShowStudentReport(true);
            setShowClassReport(false);
          }}
        >
          Student Term Report
        </Button>
        <Button
          variant={showClassReport ? "default" : "outline"}
          onClick={() => {
            setShowStudentReport(false);
            setShowClassReport(true);
          }}
        >
          Class Term Report
        </Button>
      </div>

      {!showStudentReport && !showClassReport ? (
        <>
          {/* Exam Report Cards (existing functionality) */}
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

              {reportCards.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-4">
                    <div className="space-y-2 flex-1 max-w-xs">
                      <label className="text-sm font-medium">Filter by Subject (Optional)</label>
                      <Select value={selectedSubjectId || "all"} onValueChange={(val) => setSelectedSubjectId(val === "all" ? "" : val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="All subjects" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Subjects</SelectItem>
                          {Array.from(new Set(reportCards.flatMap(rc => rc.subjects.map(s => s.subject.id)))).map(subjectId => {
                            const subject = reportCards[0]?.subjects.find(s => s.subject.id === subjectId)?.subject;
                            return subject ? (
                              <SelectItem key={subject.id} value={subject.id}>
                                {subject.name}
                              </SelectItem>
                            ) : null;
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedSubjectId && (
                      <Button variant="outline" size="sm" onClick={() => setSelectedSubjectId("")}>
                        Clear Filter
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedExam && selectedSection && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">
                    {selectedSubjectId && subjectResults ? (
                      <>
                        {allSubjects.find(s => s.id === selectedSubjectId)?.name ?? "Subject"} Results
                      </>
                    ) : (
                      <>Report Cards</>
                    )}
                    {selectedExamData && (
                      <span className="text-muted-foreground font-normal ml-2">
                        - {selectedExamData.name}
                      </span>
                    )}
                  </CardTitle>
                  {selectedExamData && !selectedExamData.isPublished && (
                    <Badge variant="outline">Results not published</Badge>
                  )}
                </div>
                {reportCards.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectedSubjectId ? handlePrintSubjectResults : handlePrintAllReportCards}
                      disabled={selectedSubjectId ? !subjectResults : false}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      {selectedSubjectId ? "Print Subject Results" : "Print Summary"}
                    </Button>
                    {!selectedSubjectId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrintDetailedClassResults}
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Print Detailed Results
                      </Button>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading report cards...</div>
                ) : reportCards.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No report cards found. Make sure results have been entered for this exam.
                  </div>
                ) : selectedSubjectId && subjectResults ? (
                  // Subject-specific results view
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[60px]">Rank</TableHead>
                          <TableHead>Student ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="text-center">Marks</TableHead>
                          <TableHead className="text-center">Grade</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subjectResults.map((r) => (
                          <TableRow key={r.student.id}>
                            <TableCell className="font-medium">#{r.rank}</TableCell>
                            <TableCell className="font-mono">{r.student.studentId}</TableCell>
                            <TableCell>{r.student.firstName} {r.student.lastName}</TableCell>
                            <TableCell className="text-center">{r.marksObtained ?? "AB"}</TableCell>
                            <TableCell className="text-center">
                              {r.grade && (
                                <Badge className={getGradeColor(r.grade)}>{r.grade}</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={r.status === "PASS" ? "default" : "destructive"}>
                                {r.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px]">#</TableHead>
                          <TableHead className="min-w-[120px]">Name</TableHead>
                          <TableHead className="min-w-[80px]">Student ID</TableHead>
                          {allSubjects.map((subject) => (
                            <TableHead key={subject.id} className="text-center min-w-[50px]">
                              {subject.code || subject.name.substring(0, 3)}
                            </TableHead>
                          ))}
                          <TableHead className="text-center min-w-[60px]">Total</TableHead>
                          <TableHead className="text-center min-w-[50px]">Avg</TableHead>
                          <TableHead className="text-center min-w-[50px]">Grade</TableHead>
                          <TableHead className="text-center min-w-[50px]">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportCards.map((card, idx) => (
                          <TableRow key={card.student.id}>
                            <TableCell className="font-medium">{idx + 1}</TableCell>
                            <TableCell>{card.student.firstName} {card.student.lastName}</TableCell>
                            <TableCell className="font-mono text-xs">{card.student.studentId}</TableCell>
                            {allSubjects.map((subject) => {
                              const subj = card.subjects.find(s => s.subject.id === subject.id);
                              return (
                                <TableCell key={subject.id} className="text-center">
                                  {subj?.marksObtained ?? "-"}
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-center font-medium">
                              {card.summary.totalMarks}/{card.summary.totalMaxMarks}
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
        </>
      ) : (
        <>
          {/* Student Term Report */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Student Term Report</CardTitle>
              <p className="text-sm text-muted-foreground">
                Generate a comprehensive report for a student across all exams in a term.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <label className="text-sm font-medium">Term</label>
                  <Select value={selectedTerm} onValueChange={setSelectedTerm}>
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

                <div className="space-y-2">
                  <label className="text-sm font-medium">Student</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                    <Input
                      placeholder="Search student..."
                      value={studentSearch}
                      onChange={(e) => {
                        setStudentSearch(e.target.value);
                        if (!e.target.value) {
                          setSelectedStudentId("");
                        }
                      }}
                      className="pl-9"
                    />
                    {studentSearch && !selectedStudentId && filteredStudents.length > 0 && (
                      <div className="absolute z-20 top-full mt-1 w-full bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredStudents.slice(0, 10).map((student) => (
                          <div
                            key={student.id}
                            className="px-3 py-2 hover:bg-muted cursor-pointer"
                            onClick={() => {
                              setSelectedStudentId(student.id);
                              setStudentSearch(`${student.firstName} ${student.lastName}`);
                            }}
                          >
                            <div className="font-medium">{student.firstName} {student.lastName}</div>
                            <div className="text-sm text-muted-foreground">{student.studentId} - {student.section?.class?.name} {student.section?.name}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedStudentId && (
                    <div className="text-sm text-green-600 flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Student selected: {students.find(s => s.id === selectedStudentId)?.firstName} {students.find(s => s.id === selectedStudentId)?.lastName}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <Button
                  onClick={fetchTermReport}
                  disabled={!selectedStudentId || !selectedYear || !selectedTerm || loadingStudentReport}
                >
                  {loadingStudentReport ? "Loading..." : "Generate Report"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Term Report Display */}
          {termReport && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">
                  {termReport.student.firstName} {termReport.student.lastName}
                  <span className="text-muted-foreground font-normal ml-2">
                    - {termReport.academicYear.name} - {termReport.term.name}
                  </span>
                </CardTitle>
                <Button onClick={handlePrintTermReport}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </CardHeader>
              <CardContent>
                {/* Student Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <div className="text-sm text-muted-foreground">Student ID</div>
                    <div className="font-mono">{termReport.student.studentId}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Class</div>
                    <div>{termReport.student.section?.class?.name ?? "N/A"} - {termReport.student.section?.name ?? "N/A"}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Average</div>
                    <div className="text-xl font-bold">{termReport.overallSummary.averagePercentage}%</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Overall Grade</div>
                    <Badge className={getGradeColor(termReport.overallSummary.overallGrade)}>
                      {termReport.overallSummary.overallGrade}
                    </Badge>
                  </div>
                </div>

                {/* Exams */}
                {termReport.exams.map((exam) => (
                  <div key={exam.id} className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{exam.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{exam.summary.percentage}%</span>
                        <Badge className={getGradeColor(exam.summary.overallGrade)}>
                          {exam.summary.overallGrade}
                        </Badge>
                      </div>
                    </div>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Subject</TableHead>
                            <TableHead className="text-center">Max</TableHead>
                            <TableHead className="text-center">Marks</TableHead>
                            <TableHead className="text-center">Grade</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {exam.subjects.map((s) => (
                            <TableRow key={s.subject.id}>
                              <TableCell>{s.subject.name}</TableCell>
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
                  </div>
                ))}

                {/* Overall Summary */}
                <div className="border rounded-lg p-4 bg-muted/50">
                  <h3 className="font-semibold mb-3">Term Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{termReport.overallSummary.totalMarks}/{termReport.overallSummary.totalMaxMarks}</div>
                      <div className="text-sm text-muted-foreground">Total Marks</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{termReport.overallSummary.averagePercentage}%</div>
                      <div className="text-sm text-muted-foreground">Average</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{termReport.overallSummary.overallGrade}</div>
                      <div className="text-sm text-muted-foreground">Overall Grade</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{termReport.overallSummary.totalPassed}</div>
                      <div className="text-sm text-muted-foreground">Passed / {termReport.overallSummary.totalFailed} Failed</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}