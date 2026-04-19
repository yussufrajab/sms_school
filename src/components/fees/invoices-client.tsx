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
import { Plus, FileText, Eye, Pencil } from "lucide-react";

type Section = { id: string; name: string; class: { id: string; name: string; level: number } };
type AcademicYear = { id: string; name: string; isCurrent: boolean };
type FeeCategory = { id: string; name: string };

type Invoice = {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  dueDate: string;
  status: "UNPAID" | "PARTIALLY_PAID" | "PAID" | "OVERDUE";
  createdAt: string;
  notes?: string | null;
  student: {
    id: string;
    studentId: string;
    firstName: string;
    lastName: string;
    section?: { name: string; class: { name: string } } | null;
  };
  academicYear: { id: string; name: string };
  items: Array<{ id: string; description: string; amount: number; discount: number; netAmount: number }>;
  _count?: { payments: number };
};

type Student = {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
};

interface InvoicesClientProps {
  sections: Section[];
  academicYears: AcademicYear[];
  feeCategories: FeeCategory[];
}

export function InvoicesClient({
  sections,
  academicYears,
}: InvoicesClientProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>(
    academicYears.find((y) => y.isCurrent)?.id || ""
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Create invoice form
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [invoiceItems, setInvoiceItems] = useState<Array<{ description: string; amount: string }>>([
    { description: "", amount: "" },
  ]);
  const [formLoading, setFormLoading] = useState(false);

  // View invoice dialog
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editDueDate, setEditDueDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editItems, setEditItems] = useState<Array<{ description: string; amount: string }>>([]);
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, [selectedYear, statusFilter]);

  useEffect(() => {
    if (selectedSection) {
      fetchStudents();
    }
  }, [selectedSection]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedYear) params.append("academicYearId", selectedYear);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);

      const res = await fetch(`/api/finance/invoices?${params}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch(`/api/students?sectionId=${selectedSection}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.data || []);
      }
    } catch (error) {
      toast.error("Failed to load students");
    }
  };

  const handleAddItem = () => {
    setInvoiceItems([...invoiceItems, { description: "", amount: "" }]);
  };

  const handleRemoveItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: "description" | "amount", value: string) => {
    const updated = [...invoiceItems];
    updated[index][field] = value;
    setInvoiceItems(updated);
  };

  const handleCreateInvoice = async () => {
    if (!selectedStudent || !dueDate) {
      toast.error("Please select student and due date");
      return;
    }

    const validItems = invoiceItems.filter(
      (item) => item.description && item.amount && parseFloat(item.amount) > 0
    );

    if (validItems.length === 0) {
      toast.error("Please add at least one valid invoice item");
      return;
    }

    setFormLoading(true);
    try {
      const res = await fetch("/api/finance/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent,
          academicYearId: selectedYear,
          dueDate,
          items: validItems.map((item) => ({
            description: item.description,
            amount: parseFloat(item.amount),
            discount: 0,
          })),
        }),
      });

      if (res.ok) {
        toast.success("Invoice created successfully");
        setIsCreateOpen(false);
        resetForm();
        fetchInvoices();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create invoice");
      }
    } catch {
      toast.error("Failed to create invoice");
    } finally {
      setFormLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedSection("");
    setSelectedStudent("");
    setStudents([]);
    setDueDate("");
    setInvoiceItems([{ description: "", amount: "" }]);
  };

  const startEdit = (invoice: Invoice) => {
    setIsEditing(true);
    setEditDueDate(format(new Date(invoice.dueDate), "yyyy-MM-dd"));
    setEditNotes(invoice.notes || "");
    setEditItems(
      invoice.items.map((item) => ({
        description: item.description,
        amount: String(item.amount),
      }))
    );
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditDueDate("");
    setEditNotes("");
    setEditItems([]);
  };

  const handleAddEditItem = () => {
    setEditItems([...editItems, { description: "", amount: "" }]);
  };

  const handleRemoveEditItem = (index: number) => {
    setEditItems(editItems.filter((_, i) => i !== index));
  };

  const handleEditItemChange = (index: number, field: "description" | "amount", value: string) => {
    const updated = [...editItems];
    updated[index][field] = value;
    setEditItems(updated);
  };

  const handleSaveEdit = async () => {
    if (!viewInvoice) return;

    const validItems = editItems.filter(
      (item) => item.description && item.amount && parseFloat(item.amount) > 0
    );

    if (validItems.length === 0) {
      toast.error("Please add at least one valid invoice item");
      return;
    }

    setEditLoading(true);
    try {
      const res = await fetch(`/api/finance/invoices/${viewInvoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dueDate: editDueDate,
          notes: editNotes || null,
          items: validItems.map((item) => ({
            description: item.description,
            amount: parseFloat(item.amount),
            discount: 0,
          })),
        }),
      });

      if (res.ok) {
        const updatedInvoice = await res.json();
        const transformedInvoice: Invoice = {
          ...updatedInvoice,
          student: updatedInvoice.student,
          academicYear: updatedInvoice.academicYear,
          items: updatedInvoice.items,
        };
        setViewInvoice(transformedInvoice);
        setInvoices((prev) =>
          prev.map((inv) => (inv.id === transformedInvoice.id ? transformedInvoice : inv))
        );
        setIsEditing(false);
        toast.success("Invoice updated successfully");
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to update invoice");
      }
    } catch {
      toast.error("Failed to update invoice");
    } finally {
      setEditLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-100 text-green-800";
      case "PARTIALLY_PAID":
        return "bg-yellow-100 text-yellow-800";
      case "OVERDUE":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PARTIALLY_PAID":
        return "Partial";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select academic year" />
            </SelectTrigger>
            <SelectContent>
              {academicYears.map((year) => (
                <SelectItem key={year.id} value={year.id}>
                  {year.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="UNPAID">Unpaid</SelectItem>
              <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="OVERDUE">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Section *</Label>
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
                  <Label>Student *</Label>
                  <Select
                    value={selectedStudent}
                    onValueChange={setSelectedStudent}
                    disabled={!selectedSection}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.studentId} - {s.firstName} {s.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Invoice Items</Label>
                  <Button variant="outline" size="sm" onClick={handleAddItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>
                {invoiceItems.map((item, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, "description", e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={item.amount}
                      onChange={(e) => handleItemChange(index, "amount", e.target.value)}
                      className="w-32"
                    />
                    {invoiceItems.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(index)}
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateInvoice} disabled={formLoading}>
                  {formLoading ? "Creating..." : "Create Invoice"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No invoices found. Create your first invoice to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono">{invoice.invoiceNumber}</TableCell>
                    <TableCell>
                      {invoice.student.firstName} {invoice.student.lastName}
                    </TableCell>
                    <TableCell>
                      {invoice.student.section?.class.name} - {invoice.student.section?.name}
                    </TableCell>
                    <TableCell className="text-right">
                      TZS {invoice.totalAmount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      TZS {invoice.paidAmount.toLocaleString()}
                    </TableCell>
                    <TableCell>{format(new Date(invoice.dueDate), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(invoice.status)}>
                        {getStatusLabel(invoice.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewInvoice(invoice)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Invoice Dialog */}
      <Dialog open={!!viewInvoice} onOpenChange={() => { setViewInvoice(null); setIsEditing(false); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice {viewInvoice?.invoiceNumber}
              </div>
              {!isEditing && viewInvoice && viewInvoice.paidAmount === 0 && (
                <Button variant="outline" size="sm" onClick={() => startEdit(viewInvoice)}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewInvoice && (
            <div className="space-y-4 py-4">
              {isEditing ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Student</div>
                      <div className="font-medium">
                        {viewInvoice.student.firstName} {viewInvoice.student.lastName}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Status</div>
                      <Badge className={getStatusColor(viewInvoice.status)}>
                        {getStatusLabel(viewInvoice.status)}
                      </Badge>
                    </div>
                    <div>
                      <Label>Due Date</Label>
                      <Input
                        type="date"
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Input
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="Optional notes"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Invoice Items</Label>
                      <Button variant="outline" size="sm" onClick={handleAddEditItem}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Item
                      </Button>
                    </div>
                    {editItems.map((item, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <Input
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => handleEditItemChange(index, "description", e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={item.amount}
                          onChange={(e) => handleEditItemChange(index, "amount", e.target.value)}
                          className="w-32"
                        />
                        {editItems.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveEditItem(index)}
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={cancelEdit}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveEdit} disabled={editLoading}>
                      {editLoading ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Student</div>
                      <div className="font-medium">
                        {viewInvoice.student.firstName} {viewInvoice.student.lastName}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Status</div>
                      <Badge className={getStatusColor(viewInvoice.status)}>
                        {getStatusLabel(viewInvoice.status)}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Due Date</div>
                      <div>{format(new Date(viewInvoice.dueDate), "MMMM d, yyyy")}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Created</div>
                      <div>{format(new Date(viewInvoice.createdAt), "MMM d, yyyy")}</div>
                    </div>
                    {viewInvoice.notes && (
                      <div className="col-span-2">
                        <div className="text-sm text-muted-foreground">Notes</div>
                        <div>{viewInvoice.notes}</div>
                      </div>
                    )}
                  </div>

                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewInvoice.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.description}</TableCell>
                            <TableCell className="text-right">
                              TZS {item.netAmount.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell className="font-bold">Total</TableCell>
                          <TableCell className="text-right font-bold">
                            TZS {viewInvoice.totalAmount.toLocaleString()}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Paid</TableCell>
                          <TableCell className="text-right text-green-600">
                            TZS {viewInvoice.paidAmount.toLocaleString()}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-bold">Balance</TableCell>
                          <TableCell className="text-right font-bold text-red-600">
                            TZS {(viewInvoice.totalAmount - viewInvoice.paidAmount).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {viewInvoice._count?.payments || 0} payment(s) recorded
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
