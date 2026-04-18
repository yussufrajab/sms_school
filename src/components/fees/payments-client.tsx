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
import { DollarSign, CreditCard, Banknote, Receipt } from "lucide-react";

type AcademicYear = { id: string; name: string; isCurrent: boolean };

type Payment = {
  id: string;
  amount: number;
  method: "CASH" | "BANK_TRANSFER" | "STRIPE" | "PAYSTACK";
  transactionId?: string | null;
  paidAt: string;
  notes?: string | null;
  invoice: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    paidAmount: number;
    status: string;
    student: {
      id: string;
      studentId: string;
      firstName: string;
      lastName: string;
    };
  };
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  status: string;
  student: {
    id: string;
    studentId: string;
    firstName: string;
    lastName: string;
  };
};

interface PaymentsClientProps {
  academicYears: AcademicYear[];
}

export function PaymentsClient({ academicYears }: PaymentsClientProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState<string>("ALL");

  // Record payment form
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState("");
  const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "BANK_TRANSFER" | "STRIPE" | "PAYSTACK">("CASH");
  const [transactionId, setTransactionId] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, [methodFilter]);

  useEffect(() => {
    if (isRecordOpen) {
      fetchUnpaidInvoices();
    }
  }, [isRecordOpen]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (methodFilter && methodFilter !== "ALL") params.append("method", methodFilter);

      const res = await fetch(`/api/finance/payments?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch payments:", error);
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  const fetchUnpaidInvoices = async () => {
    try {
      const res = await fetch("/api/finance/invoices?status=UNPAID");
      const partialRes = await fetch("/api/finance/invoices?status=PARTIALLY_PAID");
      
      const unpaidData = res.ok ? await res.json() : { data: [] };
      const partialData = partialRes.ok ? await partialRes.json() : { data: [] };
      
      setUnpaidInvoices([...unpaidData.data, ...partialData.data]);
    } catch (error) {
      toast.error("Failed to load invoices");
    }
  };

  const handleInvoiceSelect = (invoiceId: string) => {
    setSelectedInvoice(invoiceId);
    const invoice = unpaidInvoices.find((inv) => inv.id === invoiceId);
    if (invoice) {
      const remaining = invoice.totalAmount - invoice.paidAmount;
      setPaymentAmount(remaining.toString());
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice || !paymentAmount) {
      toast.error("Please select invoice and enter amount");
      return;
    }

    const invoice = unpaidInvoices.find((inv) => inv.id === selectedInvoice);
    const remaining = invoice ? invoice.totalAmount - invoice.paidAmount : 0;

    if (parseFloat(paymentAmount) > remaining) {
      toast.error("Payment amount cannot exceed remaining balance");
      return;
    }

    setFormLoading(true);
    try {
      const res = await fetch("/api/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: selectedInvoice,
          amount: parseFloat(paymentAmount),
          method: paymentMethod,
          transactionId: transactionId || undefined,
          notes: paymentNotes || undefined,
        }),
      });

      if (res.ok) {
        toast.success("Payment recorded successfully");
        setIsRecordOpen(false);
        resetForm();
        fetchPayments();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to record payment");
      }
    } catch {
      toast.error("Failed to record payment");
    } finally {
      setFormLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedInvoice("");
    setPaymentAmount("");
    setPaymentMethod("CASH");
    setTransactionId("");
    setPaymentNotes("");
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case "CASH":
        return <Banknote className="h-4 w-4" />;
      case "BANK_TRANSFER":
        return <CreditCard className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case "CASH":
        return "bg-green-100 text-green-800";
      case "BANK_TRANSFER":
        return "bg-blue-100 text-blue-800";
      case "STRIPE":
        return "bg-purple-100 text-purple-800";
      case "PAYSTACK":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "";
    }
  };

  // Calculate totals
  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const todayPayments = payments.filter(
    (p) => format(new Date(p.paidAt), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
  );
  const todayTotal = todayPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCollected.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today&apos;s Collection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${todayTotal.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">{todayPayments.length} payment(s)</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2">
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Methods</SelectItem>
              <SelectItem value="CASH">Cash</SelectItem>
              <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
              <SelectItem value="STRIPE">Stripe</SelectItem>
              <SelectItem value="PAYSTACK">Paystack</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isRecordOpen} onOpenChange={setIsRecordOpen}>
          <DialogTrigger asChild>
            <Button>
              <Receipt className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Invoice *</Label>
                <Select value={selectedInvoice} onValueChange={handleInvoiceSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    {unpaidInvoices.map((inv) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} - {inv.student.firstName} {inv.student.lastName} 
                        (${(inv.totalAmount - inv.paidAmount).toLocaleString()} remaining)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount *</Label>
                  <Input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      <SelectItem value="STRIPE">Stripe</SelectItem>
                      <SelectItem value="PAYSTACK">Paystack</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {paymentMethod !== "CASH" && (
                <div className="space-y-2">
                  <Label>Transaction ID</Label>
                  <Input
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Enter transaction reference"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Optional notes"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsRecordOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleRecordPayment} disabled={formLoading}>
                  {formLoading ? "Recording..." : "Record Payment"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading payments...</div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payments recorded yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {format(new Date(payment.paidAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="font-mono">
                      {payment.invoice.invoiceNumber}
                    </TableCell>
                    <TableCell>
                      {payment.invoice.student.firstName} {payment.invoice.student.lastName}
                    </TableCell>
                    <TableCell>
                      <Badge className={getMethodColor(payment.method)}>
                        <span className="flex items-center gap-1">
                          {getMethodIcon(payment.method)}
                          {payment.method.replace("_", " ")}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${payment.amount.toLocaleString()}
                    </TableCell>
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
