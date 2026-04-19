# Invoice Edit Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ability to edit invoice due date, notes, and items when no payments have been recorded.

**Architecture:** Extend existing PATCH API endpoint to accept items array with validation. Add edit mode to the existing View dialog in the invoices component.

**Tech Stack:** Next.js API routes, Prisma, React hooks, shadcn/ui components

---

## Files to Modify

1. `src/app/api/finance/invoices/[id]/route.ts` - Extend PATCH handler with items support
2. `src/components/fees/invoices-client.tsx` - Add edit mode state and UI to View dialog

---

### Task 1: Extend PATCH API to Support Invoice Items

**Files:**
- Modify: `src/app/api/finance/invoices/[id]/route.ts`

- [ ] **Step 1: Update validation schema to include items**

Replace the `updateInvoiceSchema` at lines 12-18:

```typescript
const invoiceItemUpdateSchema = z.object({
  id: z.string().optional(), // existing item ID (optional)
  description: z.string().min(1, "Description is required"),
  amount: z.number().positive("Amount must be positive"),
  discount: z.number().min(0, "Discount cannot be negative").default(0),
});

const updateInvoiceSchema = z.object({
  status: z
    .enum(["UNPAID", "PARTIALLY_PAID", "PAID", "OVERDUE"])
    .optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(invoiceItemUpdateSchema).min(1, "At least one item is required").optional(),
});
```

- [ ] **Step 2: Add payment check and items update logic in PATCH handler**

Replace the PATCH function body (lines 142-216) with:

```typescript
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles: UserRole[] = ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"];
  if (!allowedRoles.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.invoice.findUnique({
      where: { id },
      include: {
        Student: { select: { schoolId: true } },
        Payment: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (existing.deletedAt) {
      return NextResponse.json({ error: "Invoice has been deleted" }, { status: 409 });
    }

    if (
      session.user.role !== "SUPER_ADMIN" &&
      existing.Student.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const data = updateInvoiceSchema.parse(body);

    // Check if items can be edited
    if (data.items !== undefined && existing.paidAmount > 0) {
      return NextResponse.json(
        { error: "Cannot edit invoice items after payments have been recorded" },
        { status: 409 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Update items if provided
      if (data.items !== undefined) {
        // Delete existing items
        await tx.invoiceItem.deleteMany({
          where: { invoiceId: id },
        });

        // Create new items
        const processedItems = data.items.map((item) => ({
          id: item.id ?? randomUUID(),
          description: item.description,
          amount: item.amount,
          discount: item.discount ?? 0,
          netAmount: Math.max(0, item.amount - (item.discount ?? 0)),
        }));

        await tx.invoiceItem.createMany({
          data: processedItems.map((item) => ({
            id: item.id,
            invoiceId: id,
            description: item.description,
            amount: item.amount,
            discount: item.discount,
            netAmount: item.netAmount,
          })),
        });
      }

      // Update invoice
      return tx.invoice.update({
        where: { id },
        data: {
          ...(data.status !== undefined && { status: data.status }),
          ...(data.dueDate !== undefined && { dueDate: new Date(data.dueDate) }),
          ...(data.notes !== undefined && { notes: data.notes }),
          ...(data.items !== undefined && {
            totalAmount: data.items.reduce(
              (sum, item) => sum + Math.max(0, item.amount - (item.discount ?? 0)),
              0
            ),
          }),
          updatedAt: new Date(),
        },
        include: {
          Student: {
            select: {
              id: true,
              studentId: true,
              firstName: true,
              lastName: true,
              Section: {
                select: {
                  name: true,
                  Class: { select: { name: true } },
                },
              },
            },
          },
          AcademicYear: { select: { id: true, name: true } },
          InvoiceItem: true,
          _count: { select: { Payment: true } },
        },
      });
    });

    // Transform for client compatibility
    const transformed = {
      ...updated,
      student: updated.Student,
      academicYear: updated.AcademicYear,
      items: updated.InvoiceItem,
      _count: { payments: updated._count.Payment },
    };

    return NextResponse.json(transformed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[PATCH /api/finance/invoices/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Add randomUUID import at top of file**

Add `randomUUID` to the existing import from 'crypto' at line 5:

```typescript
import { randomUUID } from "crypto";
```

- [ ] **Step 4: Commit backend changes**

```bash
git add src/app/api/finance/invoices/\[id\]/route.ts
git commit -m "$(cat <<'EOF'
feat: extend PATCH invoice API to support editing items

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Add Edit Mode to Invoice View Dialog

**Files:**
- Modify: `src/components/fees/invoices-client.tsx`

- [ ] **Step 1: Add edit mode state variables**

After line 95 (`const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);`), add:

```typescript
  const [isEditing, setIsEditing] = useState(false);
  const [editDueDate, setEditDueDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editItems, setEditItems] = useState<Array<{ description: string; amount: string }>>([]);
  const [editLoading, setEditLoading] = useState(false);
```

- [ ] **Step 2: Add Pencil import**

Update line 33 to include Pencil icon:

```typescript
import { Plus, FileText, Eye, Pencil } from "lucide-react";
```

- [ ] **Step 3: Add helper functions for edit mode**

After line 207 (after `resetForm` function), add:

```typescript
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
        // Update local state with transformed data
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
```

- [ ] **Step 4: Update the View Dialog to include Edit button and edit mode**

Replace the View Invoice Dialog (lines 433-512) with:

```typescript
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
```

- [ ] **Step 5: Add notes field to Invoice type**

Update the Invoice type (around line 39-57) to include notes:

```typescript
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
```

- [ ] **Step 6: Commit frontend changes**

```bash
git add src/components/fees/invoices-client.tsx
git commit -m "$(cat <<'EOF'
feat: add edit mode to invoice view dialog

- Edit button visible when invoice has no payments
- Edit due date, notes, and invoice items
- Save/cancel buttons in edit mode

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Test the Feature

- [ ] **Step 1: Verify invoice edit works in browser**

1. Navigate to http://localhost:3000/fees
2. Click View on an invoice with no payments
3. Verify Edit button appears in dialog header
4. Click Edit, modify due date and items
5. Click Save Changes
6. Verify changes persist after refresh

- [ ] **Step 2: Verify edit is blocked when payments exist**

1. Find/create an invoice with payments
2. Click View
3. Verify Edit button is hidden
4. Verify only view mode is available

- [ ] **Step 3: Verify API returns 409 for item edits with payments**

Use curl or browser dev tools to send PATCH request with items to an invoice that has payments. Verify 409 response with error message.