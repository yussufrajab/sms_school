"use client";

import { useState, useEffect } from "react";
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
import { Plus, Trash2, DollarSign } from "lucide-react";

type Class = { id: string; name: string; level: number };
type AcademicYear = { id: string; name: string; isCurrent: boolean };
type FeeCategory = { id: string; name: string; description?: string | null; isRecurring: boolean };

type FeeStructure = {
  id: string;
  amount: number;
  dueDay?: number | null;
  feeCategory: { id: string; name: string };
  class?: { id: string; name: string; level: number } | null;
  academicYear: { id: string; name: string };
};

interface FeeStructuresClientProps {
  classes: Class[];
  academicYears: AcademicYear[];
  feeCategories: FeeCategory[];
}

export function FeeStructuresClient({
  classes,
  academicYears,
  feeCategories,
}: FeeStructuresClientProps) {
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>(
    academicYears.find((y) => y.isCurrent)?.id || ""
  );

  // Category form
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categoryRecurring, setCategoryRecurring] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  // Structure form
  const [isStructureOpen, setIsStructureOpen] = useState(false);
  const [structureCategoryId, setStructureCategoryId] = useState("");
  const [structureClassId, setStructureClassId] = useState("ALL");
  const [structureAmount, setStructureAmount] = useState("");
  const [structureDueDay, setStructureDueDay] = useState("");

  useEffect(() => {
    fetchStructures();
  }, [selectedYear]);

  const fetchStructures = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedYear) params.append("academicYearId", selectedYear);

      const res = await fetch(`/api/finance/fee-structures?${params}`);
      if (res.ok) {
        setStructures(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch fee structures:", error);
      toast.error("Failed to load fee structures");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!categoryName) {
      toast.error("Category name is required");
      return;
    }

    setFormLoading(true);
    try {
      const res = await fetch("/api/finance/fee-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: categoryName,
          description: categoryDescription || undefined,
          isRecurring: categoryRecurring,
        }),
      });

      if (res.ok) {
        toast.success("Category created successfully");
        setIsCategoryOpen(false);
        setCategoryName("");
        setCategoryDescription("");
        // Refresh categories by reloading page data
        window.location.reload();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create category");
      }
    } catch {
      toast.error("Failed to create category");
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreateStructure = async () => {
    if (!structureCategoryId || !structureAmount) {
      toast.error("Please fill all required fields");
      return;
    }

    setFormLoading(true);
    try {
      const res = await fetch("/api/finance/fee-structures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feeCategoryId: structureCategoryId,
          classId: structureClassId === "ALL" ? undefined : structureClassId,
          academicYearId: selectedYear,
          amount: parseFloat(structureAmount),
          dueDay: structureDueDay ? parseInt(structureDueDay) : undefined,
        }),
      });

      if (res.ok) {
        toast.success("Fee structure created successfully");
        setIsStructureOpen(false);
        resetStructureForm();
        fetchStructures();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create fee structure");
      }
    } catch {
      toast.error("Failed to create fee structure");
    } finally {
      setFormLoading(false);
    }
  };

  const resetStructureForm = () => {
    setStructureCategoryId("");
    setStructureClassId("");
    setStructureAmount("");
    setStructureDueDay("");
  };

  // Group structures by category
  const groupedStructures = structures.reduce((acc, structure) => {
    const categoryName = structure.feeCategory.name;
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(structure);
    return acc;
  }, {} as Record<string, FeeStructure[]>);

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
                  {year.isCurrent && " (Current)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Dialog open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Fee Category</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="categoryName">Category Name *</Label>
                  <Input
                    id="categoryName"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="e.g., Tuition Fee"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categoryDesc">Description</Label>
                  <Input
                    id="categoryDesc"
                    value={categoryDescription}
                    onChange={(e) => setCategoryDescription(e.target.value)}
                    placeholder="Optional description"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="recurring"
                    checked={categoryRecurring}
                    onChange={(e) => setCategoryRecurring(e.target.checked)}
                  />
                  <Label htmlFor="recurring">Recurring (monthly/termly)</Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCategoryOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateCategory} disabled={formLoading}>
                    {formLoading ? "Creating..." : "Create"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isStructureOpen} onOpenChange={setIsStructureOpen}>
            <DialogTrigger asChild>
              <Button>
                <DollarSign className="h-4 w-4 mr-2" />
                Add Fee Structure
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Fee Structure</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Fee Category *</Label>
                  <Select value={structureCategoryId} onValueChange={setStructureCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {feeCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Class (Leave empty for all classes)</Label>
                  <Select value={structureClassId} onValueChange={setStructureClassId}>
                    <SelectTrigger>
                      <SelectValue placeholder="All classes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Classes</SelectItem>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
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
                      value={structureAmount}
                      onChange={(e) => setStructureAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Due Day (1-28)</Label>
                    <Input
                      type="number"
                      value={structureDueDay}
                      onChange={(e) => setStructureDueDay(e.target.value)}
                      placeholder="e.g., 10"
                      min={1}
                      max={28}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsStructureOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateStructure} disabled={formLoading}>
                    {formLoading ? "Creating..." : "Create"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading fee structures...</div>
      ) : Object.keys(groupedStructures).length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            No fee structures found. Create categories and add fee structures to get started.
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedStructures).map(([categoryName, categoryStructures]) => (
          <Card key={categoryName}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                {categoryName}
                <Badge variant="secondary">{categoryStructures.length} entries</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Day</TableHead>
                    <TableHead>Academic Year</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryStructures.map((structure) => (
                    <TableRow key={structure.id}>
                      <TableCell>
                        {structure.class?.name || <span className="text-muted-foreground">All Classes</span>}
                      </TableCell>
                      <TableCell className="font-medium">
                        ${structure.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {structure.dueDay ? `Day ${structure.dueDay}` : "-"}
                      </TableCell>
                      <TableCell>{structure.academicYear.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
