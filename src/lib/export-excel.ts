import * as XLSX from "xlsx";

interface ExportOptions {
  filename: string;
  sheetName?: string;
}

export function exportToExcel(
  data: Record<string, unknown>[],
  columns: { header: string; key: string }[],
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
    wch: Math.max(col.header.length, 15),
  }));
  worksheet["!cols"] = colWidths;

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    options.sheetName || "Report"
  );

  // Save the file
  XLSX.writeFile(workbook, `${options.filename}.xlsx`);
}

export function exportAcademicReportToExcel(
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
  const columns = [
    { header: "Class", key: "className" },
    { header: "Total Students", key: "totalStudents" },
    { header: "Average Score (%)", key: "averageScore" },
    { header: "Highest Score (%)", key: "highestScore" },
    { header: "Lowest Score (%)", key: "lowestScore" },
    { header: "Pass Rate (%)", key: "passRate" },
  ];

  const formattedData = data.map((row) => ({
    className: row.className,
    totalStudents: row.totalStudents,
    averageScore: row.averageScore.toFixed(1),
    highestScore: row.highestScore.toFixed(1),
    lowestScore: row.lowestScore.toFixed(1),
    passRate: row.passRate.toFixed(1),
  }));

  exportToExcel(formattedData, columns, {
    filename: `academic-report-${academicYear}`,
    sheetName: "Academic Performance",
  });
}

export function exportFinancialReportToExcel(
  data: {
    totalInvoiced: number;
    totalCollected: number;
    totalOutstanding: number;
    collectionRate: number;
    overdueAmount: number;
  },
  academicYear: string,
  invoiceData?: {
    invoiceNumber: string;
    studentName: string;
    className: string;
    totalAmount: number;
    paidAmount: number;
    status: string;
    dueDate: string;
  }[]
): void {
  // Summary sheet
  const summaryColumns = [
    { header: "Metric", key: "metric" },
    { header: "Value", key: "value" },
  ];

  const summaryData = [
    { metric: "Total Invoiced", value: `$${data.totalInvoiced.toLocaleString()}` },
    { metric: "Total Collected", value: `$${data.totalCollected.toLocaleString()}` },
    { metric: "Outstanding Balance", value: `$${data.totalOutstanding.toLocaleString()}` },
    { metric: "Collection Rate", value: `${data.collectionRate.toFixed(1)}%` },
    { metric: "Overdue Amount", value: `$${data.overdueAmount.toLocaleString()}` },
  ];

  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Add summary sheet
  const summarySheet = XLSX.utils.json_to_sheet(
    summaryData.map((row) => ({ Metric: row.metric, Value: row.value }))
  );
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  // Add invoice details if provided
  if (invoiceData && invoiceData.length > 0) {
    const invoiceColumns = [
      { header: "Invoice Number", key: "invoiceNumber" },
      { header: "Student Name", key: "studentName" },
      { header: "Class", key: "className" },
      { header: "Total Amount", key: "totalAmount" },
      { header: "Paid Amount", key: "paidAmount" },
      { header: "Status", key: "status" },
      { header: "Due Date", key: "dueDate" },
    ];

    const invoiceSheet = XLSX.utils.json_to_sheet(
      invoiceData.map((row) => ({
        "Invoice Number": row.invoiceNumber,
        "Student Name": row.studentName,
        Class: row.className,
        "Total Amount": row.totalAmount,
        "Paid Amount": row.paidAmount,
        Status: row.status,
        "Due Date": row.dueDate,
      }))
    );
    XLSX.utils.book_append_sheet(workbook, invoiceSheet, "Invoice Details");
  }

  // Save the file
  XLSX.writeFile(workbook, `financial-report-${academicYear}.xlsx`);
}

export function exportAttendanceReportToExcel(
  data: {
    className: string;
    totalStudents: number;
    presentCount: number;
    absentCount: number;
    attendanceRate: number;
  }[],
  academicYear: string
): void {
  const columns = [
    { header: "Class", key: "className" },
    { header: "Total Students", key: "totalStudents" },
    { header: "Present Count", key: "presentCount" },
    { header: "Absent Count", key: "absentCount" },
    { header: "Attendance Rate (%)", key: "attendanceRate" },
  ];

  const formattedData = data.map((row) => ({
    className: row.className,
    totalStudents: row.totalStudents,
    presentCount: row.presentCount,
    absentCount: row.absentCount,
    attendanceRate: row.attendanceRate.toFixed(1),
  }));

  exportToExcel(formattedData, columns, {
    filename: `attendance-report-${academicYear}`,
    sheetName: "Attendance Summary",
  });
}

export function exportStaffReportToExcel(
  data: {
    department: string;
    totalStaff: number;
    onLeave: number;
    active: number;
  }[],
  staffDetails?: {
    employeeId: string;
    firstName: string;
    lastName: string;
    department: string;
    designation: string;
    status: string;
  }[]
): void {
  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Summary by department
  const summarySheet = XLSX.utils.json_to_sheet(
    data.map((row) => ({
      Department: row.department,
      "Total Staff": row.totalStaff,
      Active: row.active,
      "On Leave": row.onLeave,
    }))
  );
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Department Summary");

  // Staff details if provided
  if (staffDetails && staffDetails.length > 0) {
    const detailsSheet = XLSX.utils.json_to_sheet(
      staffDetails.map((row) => ({
        "Employee ID": row.employeeId,
        "First Name": row.firstName,
        "Last Name": row.lastName,
        Department: row.department,
        Designation: row.designation,
        Status: row.status,
      }))
    );
    XLSX.utils.book_append_sheet(workbook, detailsSheet, "Staff Details");
  }

  // Save the file
  XLSX.writeFile(
    workbook,
    `staff-report-${new Date().toISOString().split("T")[0]}.xlsx`
  );
}
