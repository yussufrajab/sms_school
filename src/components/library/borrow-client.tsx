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
import { Plus, BookOpen, RotateCcw, AlertTriangle, Search, Filter } from "lucide-react";

interface Book {
  id: string;
  title: string;
  authors: string;
  isbn?: string | null;
  coverUrl?: string | null;
  category?: string | null;
  shelfLocation?: string | null;
  copies: Array<{ id: string; copyNumber: string; isAvailable: boolean }>;
}

interface Student {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
}

interface BorrowRecord {
  id: string;
  borrowDate: string;
  expectedReturn: string;
  returnDate?: string | null;
  fineAmount: number;
  finePaid: boolean;
  isOverdue: boolean;
  currentFine: number;
  BookCopy: {
    id: string;
    copyNumber: string;
    Book: {
      id: string;
      title: string;
      authors: string;
      isbn?: string | null;
      coverUrl?: string | null;
      category?: string | null;
      shelfLocation?: string | null;
    };
  };
  Student: {
    id: string;
    studentId: string;
    firstName: string;
    lastName: string;
  };
}

interface BorrowClientProps {
  initialBooks: Book[];
  categories: string[];
  canManage: boolean;
}

export function BorrowClient({ initialBooks, categories, canManage }: BorrowClientProps) {
  const [records, setRecords] = useState<BorrowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "overdue" | "returned">("active");
  
  // Issue book dialog
  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState("");
  const [selectedCopy, setSelectedCopy] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [searchStudent, setSearchStudent] = useState("");
  const [issueLoading, setIssueLoading] = useState(false);
  
  // Books data
  const [books] = useState(initialBooks);
  const [availableCopies, setAvailableCopies] = useState<Array<{ id: string; copyNumber: string }>>([]);

  useEffect(() => {
    fetchRecords();
  }, [filter]);

  useEffect(() => {
    if (selectedBook) {
      const book = books.find((b) => b.id === selectedBook);
      if (book) {
        setAvailableCopies(book.copies.filter((c) => c.isAvailable));
        setSelectedCopy("");
      }
    }
  }, [selectedBook, books]);

  useEffect(() => {
    if (searchStudent.length >= 2) {
      fetchStudents();
    }
  }, [searchStudent]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === "active") {
        params.append("returned", "false");
      } else if (filter === "overdue") {
        params.append("isOverdue", "true");
      } else if (filter === "returned") {
        params.append("returned", "true");
      }

      const res = await fetch(`/api/library/borrow?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch borrow records:", error);
      toast.error("Failed to load borrow records");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch(`/api/students?search=${encodeURIComponent(searchStudent)}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch students:", error);
    }
  };

  const handleIssueBook = async () => {
    if (!selectedCopy || !selectedStudent) {
      toast.error("Please select a book copy and student");
      return;
    }

    setIssueLoading(true);
    try {
      const res = await fetch("/api/library/borrow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookCopyId: selectedCopy,
          studentId: selectedStudent,
        }),
      });

      if (res.ok) {
        toast.success("Book issued successfully");
        setIsIssueOpen(false);
        resetIssueForm();
        fetchRecords();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to issue book");
      }
    } catch {
      toast.error("Failed to issue book");
    } finally {
      setIssueLoading(false);
    }
  };

  const handleReturnBook = async (recordId: string) => {
    try {
      const res = await fetch("/api/library/borrow", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: recordId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.fineAmount > 0) {
          toast.success(`Book returned with a fine of $${data.fineAmount.toFixed(2)}`);
        } else {
          toast.success("Book returned successfully");
        }
        fetchRecords();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to return book");
      }
    } catch {
      toast.error("Failed to return book");
    }
  };

  const resetIssueForm = () => {
    setSelectedBook("");
    setSelectedCopy("");
    setSelectedStudent("");
    setSearchStudent("");
    setStudents([]);
    setAvailableCopies([]);
  };

  const getStatusBadge = (record: BorrowRecord) => {
    if (record.returnDate) {
      return <Badge className="bg-green-100 text-green-800">Returned</Badge>;
    }
    if (record.isOverdue) {
      return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-800">Active</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Borrows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {records.filter((r) => !r.returnDate && !r.isOverdue).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overdue Books
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {records.filter((r) => r.isOverdue).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Returned Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {records.filter((r) => r.returnDate && format(new Date(r.returnDate), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Fines Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${records.filter((r) => !r.returnDate).reduce((sum, r) => sum + r.currentFine, 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter records" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Records</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="returned">Returned</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {canManage && (
          <Dialog open={isIssueOpen} onOpenChange={setIsIssueOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Issue Book
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Issue Book</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Select Book</Label>
                  <Select value={selectedBook} onValueChange={setSelectedBook}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a book" />
                    </SelectTrigger>
                    <SelectContent>
                      {books
                        .filter((b) => b.copies.some((c) => c.isAvailable))
                        .map((book) => (
                          <SelectItem key={book.id} value={book.id}>
                            {book.title} ({book.copies.filter((c) => c.isAvailable).length} available)
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedBook && (
                  <div className="space-y-2">
                    <Label>Select Copy</Label>
                    <Select value={selectedCopy} onValueChange={setSelectedCopy}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a copy" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCopies.map((copy) => (
                          <SelectItem key={copy.id} value={copy.id}>
                            {copy.copyNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Search Student</Label>
                  <Input
                    placeholder="Type at least 2 characters..."
                    value={searchStudent}
                    onChange={(e) => setSearchStudent(e.target.value)}
                  />
                </div>

                {students.length > 0 && (
                  <div className="space-y-2">
                    <Label>Select Student</Label>
                    <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a student" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.studentId} - {student.firstName} {student.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsIssueOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleIssueBook} disabled={issueLoading}>
                    {issueLoading ? "Issuing..." : "Issue Book"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Borrow Records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading records...</div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No borrow records found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Book</TableHead>
                  <TableHead>Copy</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Borrow Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Return Date</TableHead>
                  <TableHead>Fine</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{record.BookCopy.Book.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {record.BookCopy.Book.authors}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {record.BookCopy.copyNumber}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {record.Student.firstName} {record.Student.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {record.Student.studentId}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(record.borrowDate), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <span className={record.isOverdue ? "text-red-600 font-medium" : ""}>
                        {format(new Date(record.expectedReturn), "MMM d, yyyy")}
                      </span>
                    </TableCell>
                    <TableCell>
                      {record.returnDate
                        ? format(new Date(record.returnDate), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {record.fineAmount > 0 || record.currentFine > 0 ? (
                        <span className="text-red-600 font-medium">
                          ${(record.returnDate ? record.fineAmount : record.currentFine).toFixed(2)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(record)}</TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        {!record.returnDate && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReturnBook(record.id)}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Return
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
