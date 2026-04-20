"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Plus,
  Wrench,
  Calendar,
  DollarSign,
  AlertTriangle,
  Loader2,
  Filter,
} from "lucide-react";

interface Vehicle {
  id: string;
  registration: string;
  make: string;
  model: string;
}

interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  vehicle: Vehicle | null;
  type: string;
  status: string;
  scheduledDate: string;
  completedDate: string | null;
  description: string;
  cost: number;
  mileage: number | null;
  serviceProvider: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MaintenanceClientProps {
  vehicles: Vehicle[];
  canManage: boolean;
}

const MAINTENANCE_TYPES = [
  { value: "ROUTINE", label: "Routine Service" },
  { value: "REPAIR", label: "Repair" },
  { value: "INSPECTION", label: "Inspection" },
  { value: "EMERGENCY", label: "Emergency" },
];

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-800",
};

export default function MaintenanceClient({
  vehicles,
  canManage,
}: MaintenanceClientProps) {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);

  const [vehicleFilter, setVehicleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const [formData, setFormData] = useState({
    vehicleId: "",
    type: "ROUTINE" as "ROUTINE" | "REPAIR" | "INSPECTION" | "EMERGENCY",
    scheduledDate: "",
    description: "",
    cost: 0,
    mileage: "",
    serviceProvider: "",
    notes: "",
  });

  useEffect(() => {
    fetchRecords();
  }, [vehicleFilter, statusFilter]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (vehicleFilter !== "ALL") params.append("vehicleId", vehicleFilter);
      if (statusFilter !== "ALL") params.append("status", statusFilter);

      const res = await fetch(`/api/transport/maintenance?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch (error) {
      console.error("Failed to fetch maintenance records:", error);
      toast.error("Failed to load maintenance records");
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingRecord(null);
    setFormData({
      vehicleId: vehicles[0]?.id || "",
      type: "ROUTINE",
      scheduledDate: new Date().toISOString().split("T")[0],
      description: "",
      cost: 0,
      mileage: "",
      serviceProvider: "",
      notes: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (record: MaintenanceRecord) => {
    setEditingRecord(record);
    setFormData({
      vehicleId: record.vehicleId,
      type: record.type as "ROUTINE" | "REPAIR" | "INSPECTION" | "EMERGENCY",
      scheduledDate: new Date(record.scheduledDate).toISOString().split("T")[0],
      description: record.description,
      cost: record.cost,
      mileage: record.mileage?.toString() || "",
      serviceProvider: record.serviceProvider || "",
      notes: record.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.vehicleId || !formData.scheduledDate || !formData.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const url = editingRecord
        ? `/api/transport/maintenance/${editingRecord.id}`
        : "/api/transport/maintenance";
      const method = editingRecord ? "PUT" : "POST";

      const payload: Record<string, unknown> = {
        vehicleId: formData.vehicleId,
        type: formData.type,
        scheduledDate: formData.scheduledDate,
        description: formData.description,
        cost: formData.cost,
        serviceProvider: formData.serviceProvider || null,
        notes: formData.notes || null,
      };

      if (formData.mileage) {
        payload.mileage = parseInt(formData.mileage);
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingRecord ? "Maintenance record updated" : "Maintenance record created");
        setDialogOpen(false);
        fetchRecords();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to save maintenance record");
      }
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error("Failed to save maintenance record");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async (record: MaintenanceRecord, newStatus: string) => {
    try {
      const res = await fetch(`/api/transport/maintenance/${record.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          completedDate: newStatus === "COMPLETED" ? new Date().toISOString() : null,
        }),
      });

      if (res.ok) {
        toast.success("Status updated");
        fetchRecords();
      } else {
        toast.error("Failed to update status");
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status");
    }
  };

  // Calculate stats
  const totalCost = records
    .filter((r) => r.status === "COMPLETED")
    .reduce((sum, r) => sum + r.cost, 0);
  const scheduledCount = records.filter((r) => r.status === "SCHEDULED").length;
  const inProgressCount = records.filter((r) => r.status === "IN_PROGRESS").length;
  const upcomingOverdue = records.filter(
    (r) => r.status === "SCHEDULED" && new Date(r.scheduledDate) < new Date()
  ).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              Total Cost (Completed)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              TZS {totalCost.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-yellow-600" />
              Scheduled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{scheduledCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wrench className="h-4 w-4 text-blue-600" />
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
          </CardContent>
        </Card>
        {upcomingOverdue > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Overdue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{upcomingOverdue}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex gap-3">
              <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Vehicles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Vehicles</SelectItem>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.registration} ({vehicle.make} {vehicle.model})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {canManage && (
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Maintenance
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Maintenance Records</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No maintenance records found. {canManage && "Add your first maintenance record."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Scheduled Date</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {record.vehicle
                        ? `${record.vehicle.registration} (${record.vehicle.make} ${record.vehicle.model})`
                        : "Unknown"}
                    </TableCell>
                    <TableCell>
                      {MAINTENANCE_TYPES.find((t) => t.value === record.type)?.label || record.type}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{record.description}</TableCell>
                    <TableCell>
                      {new Date(record.scheduledDate).toLocaleDateString()}
                      {record.status === "SCHEDULED" &&
                        new Date(record.scheduledDate) < new Date() && (
                          <AlertTriangle className="inline ml-1 h-4 w-4 text-red-500" />
                        )}
                    </TableCell>
                    <TableCell>TZS {record.cost.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[record.status] || ""}>
                        {record.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {canManage && (
                        <div className="flex gap-1 justify-end">
                          {record.status === "SCHEDULED" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusUpdate(record, "IN_PROGRESS")}
                            >
                              Start
                            </Button>
                          )}
                          {record.status === "IN_PROGRESS" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusUpdate(record, "COMPLETED")}
                            >
                              Complete
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(record)}
                          >
                            Edit
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingRecord ? "Edit Maintenance Record" : "Add Maintenance Record"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Vehicle *</Label>
              <Select
                value={formData.vehicleId}
                onValueChange={(v) => setFormData({ ...formData, vehicleId: v })}
                disabled={!!editingRecord}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.registration} ({vehicle.make} {vehicle.model})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) =>
                    setFormData({
                      ...formData,
                      type: v as "ROUTINE" | "REPAIR" | "INSPECTION" | "EMERGENCY",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MAINTENANCE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Scheduled Date *</Label>
                <Input
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the maintenance work..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Estimated Cost (TZS)</Label>
                <Input
                  type="number"
                  value={formData.cost}
                  onChange={(e) =>
                    setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <Label>Mileage (km)</Label>
                <Input
                  type="number"
                  value={formData.mileage}
                  onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                  placeholder="Current mileage"
                />
              </div>
            </div>

            <div>
              <Label>Service Provider</Label>
              <Input
                value={formData.serviceProvider}
                onChange={(e) => setFormData({ ...formData, serviceProvider: e.target.value })}
                placeholder="e.g., Toyota Service Center"
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingRecord ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}