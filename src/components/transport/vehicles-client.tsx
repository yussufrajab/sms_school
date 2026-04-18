"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Bus, User, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Vehicle {
  id: string;
  registration: string;
  make: string;
  model: string;
  year: number;
  capacity: number;
  status: string;
  driver?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    licenseNumber: string;
  } | null;
  routes: { id: string; name: string; code: string }[];
}

interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  vehicle?: { id: string } | null;
}

interface VehiclesClientProps {
  initialVehicles: Vehicle[];
  drivers: Driver[];
  canManage: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  MAINTENANCE: "bg-yellow-100 text-yellow-800",
  INACTIVE: "bg-red-100 text-red-800",
};

export default function VehiclesClient({
  initialVehicles,
  drivers,
  canManage,
}: VehiclesClientProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const [formData, setFormData] = useState({
    registration: "",
    make: "",
    model: "",
    year: new Date().getFullYear(),
    capacity: 40,
    driverId: "NONE",
  });

  const openCreateDialog = () => {
    setEditingVehicle(null);
    setFormData({
      registration: "",
      make: "",
      model: "",
      year: new Date().getFullYear(),
      capacity: 40,
      driverId: "NONE",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      registration: vehicle.registration,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      capacity: vehicle.capacity,
      driverId: vehicle.driver?.id || "NONE",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.registration || !formData.make || !formData.model) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const url = editingVehicle
        ? `/api/transport/vehicles/${editingVehicle.id}`
        : "/api/transport/vehicles";
      const method = editingVehicle ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, driverId: formData.driverId === "NONE" ? null : formData.driverId }),
      });

      if (res.ok) {
        toast.success(editingVehicle ? "Vehicle updated" : "Vehicle created");
        setDialogOpen(false);
        fetchVehicles();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to save vehicle");
      }
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error("Failed to save vehicle");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (vehicle: Vehicle) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;

    try {
      const res = await fetch(`/api/transport/vehicles/${vehicle.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Vehicle deleted");
        fetchVehicles();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to delete vehicle");
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("Failed to delete vehicle");
    }
  };

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/transport/vehicles");
      if (res.ok) {
        const data = await res.json();
        setVehicles(data);
      }
    } catch (error) {
      console.error("Failed to fetch vehicles:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter available drivers (not assigned to another vehicle)
  const availableDrivers = drivers.filter(
    (d) => !d.vehicle || d.vehicle.id === editingVehicle?.id
  );

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Vehicle
          </Button>
        </div>
      )}

      {vehicles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No vehicles found. {canManage && "Add a vehicle to get started."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((vehicle) => (
            <Card key={vehicle.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Bus className="h-5 w-5 text-blue-500" />
                      {vehicle.registration}
                    </CardTitle>
                    <p className="text-sm text-gray-500">
                      {vehicle.make} {vehicle.model} ({vehicle.year})
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      STATUS_COLORS[vehicle.status] || STATUS_COLORS.ACTIVE
                    }`}
                  >
                    {vehicle.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Capacity:</span>
                  <span className="font-medium">{vehicle.capacity} seats</span>
                </div>

                {vehicle.driver && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-purple-500" />
                    <span className="text-gray-600">Driver:</span>
                    <span>
                      {vehicle.driver.firstName} {vehicle.driver.lastName}
                    </span>
                  </div>
                )}

                {vehicle.routes.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Assigned Routes
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {vehicle.routes.map((route) => (
                        <span
                          key={route.id}
                          className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                        >
                          {route.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {canManage && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => openEditDialog(vehicle)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500"
                      onClick={() => handleDelete(vehicle)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVehicle ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Registration Number *</Label>
              <Input
                value={formData.registration}
                onChange={(e) => setFormData({ ...formData, registration: e.target.value })}
                placeholder="e.g., KA-01-AB-1234"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Make *</Label>
                <Input
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  placeholder="e.g., Tata"
                />
              </div>
              <div>
                <Label>Model *</Label>
                <Input
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="e.g., Starbus"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Year</Label>
                <Input
                  type="number"
                  value={formData.year}
                  onChange={(e) =>
                    setFormData({ ...formData, year: parseInt(e.target.value) || new Date().getFullYear() })
                  }
                />
              </div>
              <div>
                <Label>Capacity (seats)</Label>
                <Input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData({ ...formData, capacity: parseInt(e.target.value) || 40 })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Driver (Optional)</Label>
              <Select
                value={formData.driverId}
                onValueChange={(v) => setFormData({ ...formData, driverId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No driver</SelectItem>
                  {availableDrivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.firstName} {driver.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingVehicle ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
