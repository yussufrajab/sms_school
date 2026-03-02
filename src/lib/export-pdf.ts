import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ExportOptions {
  title: string;
  subtitle?: string;
  filename: string;
}

interface TableColumn {
  header: string;
  dataKey: string;
  width?: number;
}

export function exportToPDF(
  data: Record<string, unknown>[],
  columns: TableColumn[],
  options: ExportOptions
): void {
  const doc = new jsPDF();

  // Add title
  doc.setFontSize(18);
  doc.text(options.title, 14, 22);

  // Add subtitle if provided
  if (options.subtitle) {
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(options.subtitle, 14, 30);
  }

  // Add generation date
  doc.setFontSize(10);
  doc.setTextColor(150);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, options.subtitle ? 38 : 30);

  // Add table
  autoTable(doc, {
    head: [columns.map((col) => col.header)],
    body: data.map((row) => columns.map((col) => String(row[col.dataKey] ?? ""))),
    startY: options.subtitle ? 45 : 38,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [66, 139, 202] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  // Save the PDF
  doc.save(`${options.filename}.pdf`);
}

export function exportAcademicReportToPDF(
  data: {
    className: string;
    totalStudents: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    passRate: number;
  }[],
  academicYear: string
): void {
  const columns: TableColumn[] = [
    { header: "Class", dataKey: "className" },
    { header: "Students", dataKey: "totalStudents" },
    { header: "Avg Score", dataKey: "averageScore" },
    { header: "Highest", dataKey: "highestScore" },
    { header: "Lowest", dataKey: "lowestScore" },
    { header: "Pass Rate", dataKey: "passRate" },
  ];

  const formattedData = data.map((row) => ({
    ...row,
    averageScore: `${row.averageScore.toFixed(1)}%`,
    highestScore: `${row.highestScore.toFixed(1)}%`,
    lowestScore: `${row.lowestScore.toFixed(1)}%`,
    passRate: `${row.passRate.toFixed(1)}%`,
  }));

  exportToPDF(formattedData, columns, {
    title: "Academic Performance Report",
    subtitle: `Academic Year: ${academicYear}`,
    filename: `academic-report-${academicYear}`,
  });
}

export function exportFinancialReportToPDF(
  data: {
    totalInvoiced: number;
    totalCollected: number;
    totalOutstanding: number;
    collectionRate: number;
    overdueAmount: number;
  },
  academicYear: string
): void {
  const doc = new jsPDF();

  // Add title
  doc.setFontSize(18);
  doc.text("Financial Report", 14, 22);

  // Add subtitle
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Academic Year: ${academicYear}`, 14, 30);

  // Add generation date
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 38);

  // Add summary boxes
  const summaryData = [
    { label: "Total Invoiced", value: `$${data.totalInvoiced.toLocaleString()}` },
    { label: "Total Collected", value: `$${data.totalCollected.toLocaleString()}` },
    { label: "Outstanding Balance", value: `$${data.totalOutstanding.toLocaleString()}` },
    { label: "Collection Rate", value: `${data.collectionRate.toFixed(1)}%` },
    { label: "Overdue Amount", value: `$${data.overdueAmount.toLocaleString()}` },
  ];

  let yPos = 50;
  summaryData.forEach((item, index) => {
    const xPos = index % 2 === 0 ? 14 : 110;
    
    if (index % 2 === 0 && index > 0) {
      yPos += 25;
    }

    // Draw box
    doc.setDrawColor(200);
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(xPos, yPos, 85, 20, 3, 3, "FD");

    // Add label
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(item.label, xPos + 5, yPos + 8);

    // Add value
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(item.value, xPos + 5, yPos + 16);
  });

  // Save the PDF
  doc.save(`financial-report-${academicYear}.pdf`);
}

export function exportAttendanceReportToPDF(
  data: {
    className: string;
    totalStudents: number;
    presentCount: number;
    absentCount: number;
    attendanceRate: number;
  }[],
  academicYear: string
): void {
  const columns: TableColumn[] = [
    { header: "Class", dataKey: "className" },
    { header: "Students", dataKey: "totalStudents" },
    { header: "Present", dataKey: "presentCount" },
    { header: "Absent", dataKey: "absentCount" },
    { header: "Rate", dataKey: "attendanceRate" },
  ];

  const formattedData = data.map((row) => ({
    ...row,
    attendanceRate: `${row.attendanceRate.toFixed(1)}%`,
  }));

  exportToPDF(formattedData, columns, {
    title: "Attendance Report",
    subtitle: `Academic Year: ${academicYear}`,
    filename: `attendance-report-${academicYear}`,
  });
}

export function exportStaffReportToPDF(
  data: {
    department: string;
    totalStaff: number;
    onLeave: number;
    active: number;
  }[]
): void {
  const columns: TableColumn[] = [
    { header: "Department", dataKey: "department" },
    { header: "Total Staff", dataKey: "totalStaff" },
    { header: "Active", dataKey: "active" },
    { header: "On Leave", dataKey: "onLeave" },
  ];

  exportToPDF(data, columns, {
    title: "Staff Report",
    subtitle: `Generated on: ${new Date().toLocaleDateString()}`,
    filename: `staff-report-${new Date().toISOString().split("T")[0]}`,
  });
}
