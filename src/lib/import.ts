import * as XLSX from "xlsx";
import { z } from "zod";

// Types
export interface ImportColumn {
  key: string;
  label: string;
  required?: boolean;
  type?: "string" | "number" | "date" | "boolean" | "email";
  transform?: (value: unknown) => unknown;
  validate?: (value: unknown) => boolean | string;
}

export interface ImportResult<T> {
  success: boolean;
  data: T[];
  errors: ImportError[];
  skipped: number;
}

export interface ImportError {
  row: number;
  column: string;
  value: unknown;
  message: string;
}

export interface ParseOptions {
  columns: ImportColumn[];
  maxRows?: number;
  skipEmptyRows?: boolean;
  trimValues?: boolean;
}

// Parse file and return raw data
export async function parseImportFile(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          raw: false,
          defval: "",
        });

        resolve(jsonData as Record<string, unknown>[]);
      } catch (error) {
        reject(new Error("Failed to parse file. Please check the format."));
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

// Transform and validate data according to column definitions
export function transformImportData<T extends Record<string, unknown>>(
  rawData: Record<string, unknown>[],
  options: ParseOptions
): ImportResult<T> {
  const { columns, maxRows = 1000, skipEmptyRows = true, trimValues = true } = options;
  const data: T[] = [];
  const errors: ImportError[] = [];
  let skipped = 0;

  // Limit rows
  const rowsToProcess = rawData.slice(0, maxRows);

  rowsToProcess.forEach((row, rowIndex) => {
    const transformedRow: Record<string, unknown> = {};
    let hasError = false;
    let isEmpty = true;

    columns.forEach((col) => {
      // Try to find value by column key or label
      let value = row[col.key] ?? row[col.label] ?? "";

      // Trim string values
      if (trimValues && typeof value === "string") {
        value = value.trim();
      }

      // Check if row is empty
      if (value !== "" && value !== null && value !== undefined) {
        isEmpty = false;
      }

      // Apply transformation
      if (col.transform && value !== "") {
        try {
          value = col.transform(value) as string;
        } catch (error) {
          errors.push({
            row: rowIndex + 1,
            column: col.label,
            value,
            message: `Failed to transform value: ${error instanceof Error ? error.message : "Unknown error"}`,
          });
          hasError = true;
          return;
        }
      }

      // Validate required fields
      if (col.required && (value === "" || value === null || value === undefined)) {
        errors.push({
          row: rowIndex + 1,
          column: col.label,
          value,
          message: `${col.label} is required`,
        });
        hasError = true;
        return;
      }

      // Type validation
      if (value !== "" && value !== null && value !== undefined) {
        const typeError = validateType(value, col, rowIndex);
        if (typeError) {
          errors.push(typeError);
          hasError = true;
          return;
        }
      }

      // Custom validation
      if (col.validate && value !== "" && value !== null && value !== undefined) {
        const validationResult = col.validate(value);
        if (validationResult !== true) {
          errors.push({
            row: rowIndex + 1,
            column: col.label,
            value,
            message: typeof validationResult === "string" ? validationResult : `Invalid value for ${col.label}`,
          });
          hasError = true;
        }
      }

      transformedRow[col.key] = value;
    });

    // Skip empty rows if configured
    if (isEmpty && skipEmptyRows) {
      skipped++;
      return;
    }

    if (!hasError) {
      data.push(transformedRow as T);
    }
  });

  return {
    success: errors.length === 0,
    data,
    errors,
    skipped,
  };
}

// Type validation helper
function validateType(
  value: unknown,
  col: ImportColumn,
  rowIndex: number
): ImportError | null {
  switch (col.type) {
    case "number":
      if (isNaN(Number(value))) {
        return {
          row: rowIndex + 1,
          column: col.label,
          value,
          message: `${col.label} must be a number`,
        };
      }
      break;

    case "date":
      const dateValue = typeof value === "string" ? value : String(value);
      if (dateValue && isNaN(Date.parse(dateValue))) {
        // Try Excel date format
        const excelDate = XLSX.SSF.parseDate(Number(value));
        if (!excelDate) {
          return {
            row: rowIndex + 1,
            column: col.label,
            value,
            message: `${col.label} must be a valid date`,
          };
        }
      }
      break;

    case "boolean":
      const boolValue = String(value).toLowerCase();
      if (!["true", "false", "1", "0", "yes", "no"].includes(boolValue)) {
        return {
          row: rowIndex + 1,
          column: col.label,
          value,
          message: `${col.label} must be true or false`,
        };
      }
      break;

    case "email":
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(value))) {
        return {
          row: rowIndex + 1,
          column: col.label,
          value,
          message: `${col.label} must be a valid email address`,
        };
      }
      break;
  }

  return null;
}

// Zod schema validation helper
export function validateWithZod<T>(
  data: Record<string, unknown>[],
  schema: z.ZodSchema<T>
): ImportResult<T> {
  const validData: T[] = [];
  const errors: ImportError[] = [];

  data.forEach((row, rowIndex) => {
    try {
      const validated = schema.parse(row);
      validData.push(validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.issues.forEach((err) => {
          errors.push({
            row: rowIndex + 1,
            column: err.path.join("."),
            value: err.path.reduce((obj: unknown, key) => {
              if (obj && typeof obj === 'object') {
                return (obj as Record<string, unknown>)[String(key)];
              }
              return undefined;
            }, row),
            message: err.message,
          });
        });
      }
    }
  });

  return {
    success: errors.length === 0,
    data: validData,
    errors,
    skipped: 0,
  };
}

// Common transform functions
export const transforms = {
  toUpperCase: (value: unknown) =>
    typeof value === "string" ? value.toUpperCase() : value,

  toLowerCase: (value: unknown) =>
    typeof value === "string" ? value.toLowerCase() : value,

  toNumber: (value: unknown) => {
    const num = Number(value);
    return isNaN(num) ? value : num;
  },

  toBoolean: (value: unknown) => {
    if (typeof value === "boolean") return value;
    const strValue = String(value).toLowerCase();
    if (["true", "1", "yes"].includes(strValue)) return true;
    if (["false", "0", "no"].includes(strValue)) return false;
    return value;
  },

  toDate: (value: unknown) => {
    if (value instanceof Date) return value;
    const date = new Date(String(value));
    return isNaN(date.getTime()) ? value : date;
  },

  trim: (value: unknown) =>
    typeof value === "string" ? value.trim() : value,

  capitalize: (value: unknown) =>
    typeof value === "string"
      ? value.replace(/\b\w/g, (char) => char.toUpperCase())
      : value,
};

// Common validation functions
export const validators = {
  isPositiveNumber: (value: unknown) => {
    const num = Number(value);
    return !isNaN(num) && num >= 0;
  },

  isNonEmptyString: (value: unknown) => {
    return typeof value === "string" && value.trim().length > 0;
  },

  isValidPhone: (value: unknown) => {
    const phoneRegex = /^[\d\s\-+()]{7,15}$/;
    return typeof value === "string" && phoneRegex.test(value);
  },

  isValidEmail: (value: unknown) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return typeof value === "string" && emailRegex.test(value);
  },

  isInList: (list: string[]) => (value: unknown) => {
    return typeof value === "string" && list.includes(value);
  },

  hasMinLength: (min: number) => (value: unknown) => {
    return typeof value === "string" && value.length >= min;
  },

  hasMaxLength: (max: number) => (value: unknown) => {
    return typeof value === "string" && value.length <= max;
  },

  isInRange: (min: number, max: number) => (value: unknown) => {
    const num = Number(value);
    return !isNaN(num) && num >= min && num <= max;
  },
};

// Predefined column configurations for common imports
export const importTemplates = {
  students: {
    columns: [
      { key: "studentId", label: "Student ID", required: true },
      { key: "firstName", label: "First Name", required: true },
      { key: "lastName", label: "Last Name", required: true },
      { key: "gender", label: "Gender", required: true, validate: validators.isInList(["Male", "Female", "Other"]) },
      { key: "dateOfBirth", label: "Date of Birth", required: true, type: "date" as const },
      { key: "class", label: "Class", required: true },
      { key: "section", label: "Section", required: true },
      { key: "phone", label: "Phone", type: "string" as const },
      { key: "email", label: "Email", type: "email" as const },
      { key: "address", label: "Address" },
      { key: "guardianName", label: "Guardian Name" },
      { key: "guardianPhone", label: "Guardian Phone" },
    ],
  },

  staff: {
    columns: [
      { key: "employeeId", label: "Employee ID", required: true },
      { key: "firstName", label: "First Name", required: true },
      { key: "lastName", label: "Last Name", required: true },
      { key: "email", label: "Email", required: true, type: "email" as const },
      { key: "department", label: "Department", required: true },
      { key: "designation", label: "Designation", required: true },
      { key: "employmentType", label: "Employment Type", validate: validators.isInList(["FULL_TIME", "PART_TIME", "CONTRACT"]) },
      { key: "phone", label: "Phone" },
      { key: "dateOfBirth", label: "Date of Birth", type: "date" as const },
      { key: "address", label: "Address" },
    ],
  },

  attendance: {
    columns: [
      { key: "studentId", label: "Student ID", required: true },
      { key: "date", label: "Date", required: true, type: "date" as const },
      { key: "status", label: "Status", required: true, validate: validators.isInList(["PRESENT", "ABSENT", "LATE", "EXCUSED"]) },
      { key: "remarks", label: "Remarks" },
    ],
  },

  grades: {
    columns: [
      { key: "studentId", label: "Student ID", required: true },
      { key: "subject", label: "Subject", required: true },
      { key: "marksObtained", label: "Marks Obtained", required: true, type: "number" as const },
      { key: "maxMarks", label: "Max Marks", required: true, type: "number" as const },
      { key: "grade", label: "Grade" },
      { key: "remarks", label: "Remarks" },
    ],
  },

  books: {
    columns: [
      { key: "isbn", label: "ISBN" },
      { key: "title", label: "Title", required: true },
      { key: "authors", label: "Authors", required: true },
      { key: "publisher", label: "Publisher" },
      { key: "category", label: "Category" },
      { key: "totalCopies", label: "Total Copies", required: true, type: "number" as const },
      { key: "shelfLocation", label: "Shelf Location" },
    ],
  },
};

// Generate import template file
export function generateImportTemplate(
  columns: ImportColumn[],
  filename: string = "import-template"
): void {
  const headers = columns.map((col) => col.label);
  const exampleRow = columns.map((col) => {
    switch (col.type) {
      case "number":
        return "0";
      case "date":
        return "YYYY-MM-DD";
      case "boolean":
        return "true/false";
      case "email":
        return "example@email.com";
      default:
        return "";
    }
  });

  const worksheet = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
