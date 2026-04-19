# Invoice Edit Feature Design

**Date:** 2026-04-19
**Status:** Approved

## Overview

Add ability to edit invoices in the fees page. Users can correct mistakes in invoices that have no payments recorded.

## Requirements

### Editable Fields
- Due date
- Notes
- Invoice items (description, amount, discount)

### Constraints
- Invoice items only editable when `paidAmount === 0`
- If payments exist, only due date and notes can be edited
- Status remains unchanged after edit
- Total amount recalculated from items

## Technical Design

### Backend

**Extend PATCH `/api/finance/invoices/[id]`**

Current schema:
```typescript
const updateInvoiceSchema = z.object({
  status: z.enum(["UNPAID", "PARTIALLY_PAID", "PAID", "OVERDUE"]).optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});
```

New schema:
```typescript
const invoiceItemSchema = z.object({
  id: z.string().optional(), // existing item ID
  description: z.string().min(1),
  amount: z.number().positive(),
  discount: z.number().min(0).default(0),
});

const updateInvoiceSchema = z.object({
  status: z.enum(["UNPAID", "PARTIALLY_PAID", "PAID", "OVERDUE"]).optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1).optional(),
});
```

**Logic:**
1. If `items` provided, check `paidAmount === 0`
2. If payments exist, return 409 Conflict with message
3. Delete existing items, create new items in transaction
4. Recalculate `totalAmount` from new items
5. Return updated invoice

### Frontend

**Edit button in View dialog:**
- Position: Next to Close button in dialog header
- Visibility: Show "Edit" button always, but disable item editing when `paidAmount > 0`
- Edit mode: Clicking Edit switches dialog to editable state

**Edit mode fields:**
- Due date: `<Input type="date" />`
- Notes: `<Input />` or `<Textarea />`
- Items: Table with editable description/amount/discount, add/remove buttons
- Actions: "Cancel" and "Save" buttons

**State management:**
- `isEditing: boolean` - tracks edit mode
- `editData: Invoice` - stores form state during edit
- On cancel: restore original data, exit edit mode
- On save: call PATCH, update local state, exit edit mode

### User Flow

1. User clicks View button on invoice row
2. View dialog opens showing invoice details
3. User clicks Edit button
4. Dialog switches to edit mode (fields become editable)
5. User modifies due date, notes, or items
6. User clicks Save
7. If items edited and payments exist → error toast
8. Otherwise → success, return to view mode with updated data

## Files to Modify

1. `src/app/api/finance/invoices/[id]/route.ts` - Extend PATCH handler
2. `src/components/fees/invoices-client.tsx` - Add edit mode to View dialog