import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ExportFormat } from "@/components/ui/export-button";

// Types
export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ExportOptions {
  filename: string;
  title?: string;
  subtitle?: string;
  sheetName?: string;
  orientation?: "portrait" | "landscape";
}

// Main export function that handles all formats
export function exportData(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  format: ExportFormat,
  options: ExportOptions
): void {
  switch (format) {
    case "csv":
      exportToCSV(data, columns, options);
      break;
    case "excel":
      exportToExcel(data, columns, options);
      break;
    case "pdf":
      exportToPDF(data, columns, options);
      break;
  }
}

// CSV Export
function exportToCSV(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  options: ExportOptions
): void {
  const headers = columns.map((col) => col.header).join(",");
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = row[col.key];
        if (value === null || value === undefined) return "";
        // Handle values that might contain commas or quotes
        if (typeof value === "string" && (value.includes(",") || value.includes('"') || value.includes("\n"))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      })
      .join(",")
  );

  const csv = [headers, ...rows].join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${options.filename}.csv`);
}

// Excel Export
function exportToExcel(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  options: ExportOptions
): void {
  // Transform data according to columns
  const transformedData = data.map((row) => {
    const newRow: Record<string, unknown> = {};
    columns.forEach((col) => {
      newRow[col.header] = row[col.key] ?? "";
    });
    return newRow;
  });

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(transformedData);

  // Set column widths
  const colWidths = columns.map((col) => ({
    wch: Math.max(col.header.length, col.width || 15),
  }));
  worksheet["!cols"] = colWidths;

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    options.sheetName || "Data"
  );

  // Save the file
  XLSX.writeFile(workbook, `${options.filename}.xlsx`);
}

// PDF Export
function exportToPDF(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  options: ExportOptions
): void {
  const doc = new jsPDF({
    orientation: options.orientation || "portrait",
    unit: "mm",
    format: "a4",
  });

  // Add title
  doc.setFontSize(18);
  doc.text(options.title || "Export Report", 14, 22);

  // Add subtitle if provided
  let yPos = 30;
  if (options.subtitle) {
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(options.subtitle, 14, yPos);
    yPos += 8;
  }

  // Add generation date
  doc.setFontSize(10);
  doc.setTextColor(150);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, yPos);
  yPos += 10;

  // Add table
  autoTable(doc, {
    head: [columns.map((col) => col.header)],
    body: data.map((row) =>
      columns.map((col) => {
        const value = row[col.key];
        if (value === null || value === undefined) return "";
        if (typeof value === "number") return value;
        return String(value);
      })
    ),
    startY: yPos,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [66, 139, 202] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: columns.reduce(
      (acc, col, index) => ({
        ...acc,
        [index]: { cellWidth: col.width || "auto" },
      }),
      {}
    ),
  });

  // Save the PDF
  doc.save(`${options.filename}.pdf`);
}

// Helper function to download blob
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Specialized export functions for different modules

// Students Export
export function exportStudents(
  students: Array<{
    studentId: string;
    firstName: string;
    lastName: string;
    class: string;
    section: string;
    gender: string;
    dateOfBirth: Date | string;
    status: string;
    phone?: string;
    email?: string;
  }>,
  format: ExportFormat
): void {
  const columns: ExportColumn[] = [
    { header: "Student ID", key: "studentId" },
    { header: "First Name", key: "firstName" },
    { header: "Last Name", key: "lastName" },
    { header: "Class", key: "class" },
    { header: "Section", key: "section" },
    { header: "Gender", key: "gender" },
    { header: "Date of Birth", key: "dateOfBirth" },
    { header: "Status", key: "status" },
    { header: "Phone", key: "phone" },
    { header: "Email", key: "email" },
  ];

  const data = students.map((s) => ({
    ...s,
    dateOfBirth: typeof s.dateOfBirth === "string" ? s.dateOfBirth : s.dateOfBirth?.toLocaleDateString?.() || "",
  }));

  exportData(data, columns, format, {
    filename: `students-${new Date().toISOString().split("T")[0]}`,
    title: "Students Report",
    sheetName: "Students",
  });
}

// Staff Export
export function exportStaff(
  staff: Array<{
    employeeId: string;
    firstName: string;
    lastName: string;
    department: string;
    designation: string;
    employmentType: string;
    phone?: string;
    email?: string;
    status: string;
  }>,
  format: ExportFormat
): void {
  const columns: ExportColumn[] = [
    { header: "Employee ID", key: "employeeId" },
    { header: "First Name", key: "firstName" },
    { header: "Last Name", key: "lastName" },
    { header: "Department", key: "department" },
    { header: "Designation", key: "designation" },
    { header: "Employment Type", key: "employmentType" },
    { header: "Phone", key: "phone" },
    { header: "Email", key: "email" },
    { header: "Status", key: "status" },
  ];

  exportData(staff as Record<string, unknown>[], columns, format, {
    filename: `staff-${new Date().toISOString().split("T")[0]}`,
    title: "Staff Report",
    sheetName: "Staff",
  });
}

// Attendance Export
export function exportAttendance(
  attendance: Array<{
    studentId: string;
    studentName: string;
    class: string;
    section: string;
    date: Date | string;
    status: string;
    remarks?: string;
  }>,
  format: ExportFormat,
  dateRange?: string
): void {
  const columns: ExportColumn[] = [
    { header: "Student ID", key: "studentId" },
    { header: "Student Name", key: "studentName" },
    { header: "Class", key: "class" },
    { header: "Section", key: "section" },
    { header: "Date", key: "date" },
    { header: "Status", key: "status" },
    { header: "Remarks", key: "remarks" },
  ];

  const data = attendance.map((a) => ({
    ...a,
    date: typeof a.date === "string" ? a.date : a.date?.toLocaleDateString?.() || "",
  }));

  exportData(data, columns, format, {
    filename: `attendance-${new Date().toISOString().split("T")[0]}`,
    title: "Attendance Report",
    subtitle: dateRange,
    sheetName: "Attendance",
  });
}

// Financial Export
export function exportFinancial(
  invoices: Array<{
    invoiceNumber: string;
    studentName: string;
    class: string;
    totalAmount: number;
    paidAmount: number;
    balance: number;
    status: string;
    dueDate: Date | string;
  }>,
  format: ExportFormat,
  summary?: {
    totalInvoiced: number;
    totalCollected: number;
    totalOutstanding: number;
  }
): void {
  const columns: ExportColumn[] = [
    { header: "Invoice Number", key: "invoiceNumber" },
    { header: "Student Name", key: "studentName" },
    { header: "Class", key: "class" },
    { header: "Total Amount", key: "totalAmount" },
    { header: "Paid Amount", key: "paidAmount" },
    { header: "Balance", key: "balance" },
    { header: "Status", key: "status" },
    { header: "Due Date", key: "dueDate" },
  ];

  const data = invoices.map((i) => ({
    ...i,
    dueDate: typeof i.dueDate === "string" ? i.dueDate : i.dueDate?.toLocaleDateString?.() || "",
  }));

  exportData(data, columns, format, {
    filename: `financial-report-${new Date().toISOString().split("T")[0]}`,
    title: "Financial Report",
    subtitle: summary
      ? `Total: $${summary.totalInvoiced.toLocaleString()} | Collected: $${summary.totalCollected.toLocaleString()} | Outstanding: $${summary.totalOutstanding.toLocaleString()}`
      : undefined,
    sheetName: "Invoices",
  });
}

// Exam Results Export
export function exportExamResults(
  results: Array<{
    studentId: string;
    studentName: string;
    class: string;
    section: string;
    subject: string;
    marksObtained: number;
    maxMarks: number;
    percentage: number;
    grade: string;
    rank?: number;
  }>,
  format: ExportFormat,
  examName: string
): void {
  const columns: ExportColumn[] = [
    { header: "Student ID", key: "studentId" },
    { header: "Student Name", key: "studentName" },
    { header: "Class", key: "class" },
    { header: "Section", key: "section" },
    { header: "Subject", key: "subject" },
    { header: "Marks Obtained", key: "marksObtained" },
    { header: "Max Marks", key: "maxMarks" },
    { header: "Percentage", key: "percentage" },
    { header: "Grade", key: "grade" },
    { header: "Rank", key: "rank" },
  ];

  exportData(results as Record<string, unknown>[], columns, format, {
    filename: `exam-results-${examName.toLowerCase().replace(/\s+/g, "-")}`,
    title: `Exam Results - ${examName}`,
    sheetName: "Results",
  });
}

// Library Books Export
export function exportLibraryBooks(
  books: Array<{
    isbn: string;
    title: string;
    authors: string;
    publisher?: string;
    category?: string;
    totalCopies: number;
    availableCopies: number;
    shelfLocation?: string;
  }>,
  format: ExportFormat
): void {
  const columns: ExportColumn[] = [
    { header: "ISBN", key: "isbn" },
    { header: "Title", key: "title" },
    { header: "Authors", key: "authors" },
    { header: "Publisher", key: "publisher" },
    { header: "Category", key: "category" },
    { header: "Total Copies", key: "totalCopies" },
    { header: "Available Copies", key: "availableCopies" },
    { header: "Shelf Location", key: "shelfLocation" },
  ];

  exportData(books as Record<string, unknown>[], columns, format, {
    filename: `library-books-${new Date().toISOString().split("T")[0]}`,
    title: "Library Books Report",
    sheetName: "Books",
  });
}

// Audit Logs Export
export function exportAuditLogs(
  logs: Array<{
    timestamp: Date | string;
    user: string;
    action: string;
    entityType: string;
    entityId?: string;
    ipAddress?: string;
    details?: string;
  }>,
  format: ExportFormat
): void {
  const columns: ExportColumn[] = [
    { header: "Timestamp", key: "timestamp" },
    { header: "User", key: "user" },
    { header: "Action", key: "action" },
    { header: "Entity Type", key: "entityType" },
    { header: "Entity ID", key: "entityId" },
    { header: "IP Address", key: "ipAddress" },
    { header: "Details", key: "details" },
  ];

  const data = logs.map((l) => ({
    ...l,
    timestamp: typeof l.timestamp === "string" ? l.timestamp : l.timestamp?.toLocaleString?.() || "",
  }));

  exportData(data, columns, format, {
    filename: `audit-logs-${new Date().toISOString().split("T")[0]}`,
    title: "Audit Logs",
    sheetName: "Audit Logs",
    orientation: "landscape",
  });
}
