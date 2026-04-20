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
import { Loader2, Plus, User, Phone, CreditCard, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  licenseNumber: string;
  licenseExpiry: string;
  phone: string | null;
  isActive: boolean;
  vehicle?: {
    id: string;
    registration: string;
    make: string;
    model: string;
  } | null;
}

interface DriversClientProps {
  initialDrivers: Driver[];
  canManage: boolean;
}

export default function DriversClient({
  initialDrivers,
  canManage,
}: DriversClientProps) {
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    licenseNumber: "",
    licenseExpiry: "",
    phone: "",
  });

  const openCreateDialog = () => {
    setEditingDriver(null);
    setFormData({
      firstName: "",
      lastName: "",
      licenseNumber: "",
      licenseExpiry: "",
      phone: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      firstName: driver.firstName,
      lastName: driver.lastName,
      licenseNumber: driver.licenseNumber,
      licenseExpiry: new Date(driver.licenseExpiry).toISOString().split("T")[0],
      phone: driver.phone || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.firstName || !formData.lastName || !formData.licenseNumber || !formData.licenseExpiry) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const url = editingDriver
        ? `/api/transport/drivers/${editingDriver.id}`
        : "/api/transport/drivers";
      const method = editingDriver ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(editingDriver ? "Driver updated" : "Driver created");
        setDialogOpen(false);
        fetchDrivers();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to save driver");
      }
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error("Failed to save driver");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (driver: Driver) => {
    if (driver.vehicle) {
      toast.error("Cannot delete driver assigned to a vehicle");
      return;
    }

    if (!confirm("Are you sure you want to delete this driver?")) return;

    try {
      const res = await fetch(`/api/transport/drivers/${driver.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Driver deleted");
        fetchDrivers();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to delete driver");
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("Failed to delete driver");
    }
  };

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/transport/drivers");
      if (res.ok) {
        const data = await res.json();
        setDrivers(data);
      }
    } catch (error) {
      console.error("Failed to fetch drivers:", error);
    } finally {
      setLoading(false);
    }
  };

  const isLicenseExpiringSoon = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const isLicenseExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date();
  };

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Driver
          </Button>
        </div>
      )}

      {drivers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No drivers found. {canManage && "Add a driver to get started."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {drivers.map((driver) => {
            const licenseExpired = isLicenseExpired(driver.licenseExpiry);
            const licenseExpiring = isLicenseExpiringSoon(driver.licenseExpiry);

            return (
              <Card
                key={driver.id}
                className={`hover:shadow-md transition-shadow ${
                  licenseExpired ? "border-red-300 bg-red-50" : licenseExpiring ? "border-yellow-300 bg-yellow-50" : ""
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-5 w-5 text-purple-500" />
                        {driver.firstName} {driver.lastName}
                      </CardTitle>
                    </div>
                    {(licenseExpired || licenseExpiring) && (
                      <AlertTriangle
                        className={`h-5 w-5 ${licenseExpired ? "text-red-500" : "text-yellow-500"}`}
                      />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">License:</span>
                    <span className="font-mono">{driver.licenseNumber}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">Expires:</span>
                    <span
                      className={
                        licenseExpired
                          ? "text-red-600 font-medium"
                          : licenseExpiring
                          ? "text-yellow-600 font-medium"
                          : ""
                      }
                    >
                      {new Date(driver.licenseExpiry).toLocaleDateString()}
                      {licenseExpired && " (Expired)"}
                      {licenseExpiring && " (Expiring Soon)"}
                    </span>
                  </div>

                  {driver.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{driver.phone}</span>
                    </div>
                  )}

                  {driver.vehicle && (
                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        Assigned Vehicle
                      </p>
                      <p className="text-sm">
                        {driver.vehicle.registration} ({driver.vehicle.make} {driver.vehicle.model})
                      </p>
                    </div>
                  )}

                  {canManage && (
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(driver)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500"
                        onClick={() => handleDelete(driver)}
                        disabled={!!driver.vehicle}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDriver ? "Edit Driver" : "Add Driver"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name *</Label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="First name"
                />
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Last name"
                />
              </div>
            </div>

            <div>
              <Label>License Number *</Label>
              <Input
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                placeholder="e.g., DL-1234567890"
              />
            </div>

            <div>
              <Label>License Expiry Date *</Label>
              <Input
                type="date"
                value={formData.licenseExpiry}
                onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
              />
            </div>

            <div>
              <Label>Phone (Optional)</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g., +91 9876543210"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingDriver ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
