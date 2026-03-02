"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";

interface ImportColumn {
  key: string;
  label: string;
  required?: boolean;
  type?: "string" | "number" | "date" | "boolean";
}

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  columns: ImportColumn[];
  onImport: (data: Record<string, unknown>[]) => Promise<void> | void;
  maxRows?: number;
  acceptedFileTypes?: string[];
}

interface ValidationError {
  row: number;
  column: string;
  message: string;
}

export function ImportDialog({
  open,
  onOpenChange,
  title = "Import Data",
  description = "Upload a CSV or Excel file to import data",
  columns,
  onImport,
  maxRows = 1000,
  acceptedFileTypes = [".csv", ".xlsx", ".xls"],
}: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const validateData = useCallback(
    (rows: Record<string, unknown>[]): ValidationError[] => {
      const validationErrors: ValidationError[] = [];

      rows.forEach((row, rowIndex) => {
        columns.forEach((col) => {
          const value = row[col.key];

          // Check required fields
          if (col.required && (value === undefined || value === null || value === "")) {
            validationErrors.push({
              row: rowIndex + 1,
              column: col.label,
              message: `${col.label} is required`,
            });
            return;
          }

          // Skip validation if value is empty and not required
          if (value === undefined || value === null || value === "") {
            return;
          }

          // Type validation
          switch (col.type) {
            case "number":
              if (isNaN(Number(value))) {
                validationErrors.push({
                  row: rowIndex + 1,
                  column: col.label,
                  message: `${col.label} must be a number`,
                });
              }
              break;
            case "date":
              if (isNaN(Date.parse(String(value)))) {
                validationErrors.push({
                  row: rowIndex + 1,
                  column: col.label,
                  message: `${col.label} must be a valid date`,
                });
              }
              break;
            case "boolean":
              if (!["true", "false", "1", "0", true, false].includes(value as string | boolean)) {
                validationErrors.push({
                  row: rowIndex + 1,
                  column: col.label,
                  message: `${col.label} must be true or false`,
                });
              }
              break;
          }
        });
      });

      return validationErrors;
    },
    [columns]
  );

  const parseFile = useCallback(
    async (file: File): Promise<Record<string, unknown>[]> => {
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
            reject(new Error("Failed to parse file"));
          }
        };

        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsArrayBuffer(file);
      });
    },
    []
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const selectedFile = acceptedFiles[0];
      if (!selectedFile) return;

      setFile(selectedFile);
      setIsProcessing(true);
      setImportResult(null);

      try {
        const parsedData = await parseFile(selectedFile);

        // Check row limit
        if (parsedData.length > maxRows) {
          setErrors([
            {
              row: 0,
              column: "File",
              message: `File exceeds maximum row limit of ${maxRows}`,
            },
          ]);
          setData([]);
          setIsProcessing(false);
          return;
        }

        // Map column headers to keys
        const mappedData = parsedData.map((row) => {
          const mappedRow: Record<string, unknown> = {};
          columns.forEach((col) => {
            // Try to find value by column label or key
            mappedRow[col.key] = row[col.key] ?? row[col.label] ?? "";
          });
          return mappedRow;
        });

        setData(mappedData);
        const validationErrors = validateData(mappedData);
        setErrors(validationErrors);
      } catch (error) {
        setErrors([
          {
            row: 0,
            column: "File",
            message: "Failed to parse file. Please check the format.",
          },
        ]);
        setData([]);
      }

      setIsProcessing(false);
    },
    [columns, maxRows, parseFile, validateData]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
  });

  const handleImport = async () => {
    if (errors.length > 0) return;

    setIsImporting(true);
    try {
      await onImport(data);
      setImportResult({
        success: true,
        message: `Successfully imported ${data.length} records`,
      });
      // Reset after successful import
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (error) {
      setImportResult({
        success: false,
        message: error instanceof Error ? error.message : "Import failed",
      });
    }
    setIsImporting(false);
  };

  const handleClose = () => {
    setFile(null);
    setData([]);
    setErrors([]);
    setImportResult(null);
    onOpenChange(false);
  };

  const hasErrors = errors.length > 0;
  const canImport = data.length > 0 && !hasErrors && !isImporting;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Drop Zone */}
          {!file && (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-1">
                {isDragActive ? "Drop file here" : "Drag & drop file here"}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse
              </p>
              <div className="flex justify-center gap-2">
                {acceptedFileTypes.map((type) => (
                  <Badge key={type} variant="secondary">
                    {type.toUpperCase().replace(".", "")}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* File Info */}
          {file && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-3">
                {file.name.endsWith(".csv") ? (
                  <FileText className="h-8 w-8 text-blue-500" />
                ) : (
                  <FileSpreadsheet className="h-8 w-8 text-green-500" />
                )}
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB • {data.length} rows
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setFile(null);
                  setData([]);
                  setErrors([]);
                  setImportResult(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Processing State */}
          {isProcessing && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <span className="ml-3">Processing file...</span>
            </div>
          )}

          {/* Errors */}
          {hasErrors && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">
                  Found {errors.length} validation error(s):
                </p>
                <ScrollArea className="h-24">
                  <ul className="text-sm space-y-1">
                    {errors.slice(0, 10).map((error, index) => (
                      <li key={index}>
                        Row {error.row}: {error.message}
                      </li>
                    ))}
                    {errors.length > 10 && (
                      <li>...and {errors.length - 10} more errors</li>
                    )}
                  </ul>
                </ScrollArea>
              </AlertDescription>
            </Alert>
          )}

          {/* Success Result */}
          {importResult && (
            <Alert
              variant={importResult.success ? "default" : "destructive"}
              className={
                importResult.success ? "border-green-500 bg-green-50" : ""
              }
            >
              {importResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>{importResult.message}</AlertDescription>
            </Alert>
          )}

          {/* Preview Table */}
          {data.length > 0 && !isProcessing && (
            <div className="space-y-2">
              <h4 className="font-medium">Preview (first 10 rows)</h4>
              <ScrollArea className="h-64 border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columns.map((col) => (
                        <TableHead key={col.key}>
                          {col.label}
                          {col.required && (
                            <span className="text-destructive ml-1">*</span>
                          )}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.slice(0, 10).map((row, index) => (
                      <TableRow key={index}>
                        {columns.map((col) => (
                          <TableCell key={col.key}>
                            {String(row[col.key] ?? "")}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              {data.length > 10 && (
                <p className="text-sm text-muted-foreground text-center">
                  Showing 10 of {data.length} rows
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!canImport}
          >
            {isImporting ? "Importing..." : `Import ${data.length} Records`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Template download helper
export function downloadImportTemplate(
  columns: ImportColumn[],
  filename: string = "import-template"
) {
  const headers = columns.map((col) => col.label);
  const worksheet = XLSX.utils.aoa_to_sheet([headers]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
