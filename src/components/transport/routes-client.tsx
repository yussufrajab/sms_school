"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Loader2, Plus, MapPin, Bus, Users, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Stop {
  name: string;
  estimatedTime: string;
}

interface Route {
  id: string;
  name: string;
  code: string;
  startPoint: string;
  endPoint: string;
  stops: Stop[];
  vehicleId: string | null;
  vehicle: {
    id: string;
    registration: string;
    make: string;
    model: string;
    driver?: {
      id: string;
      firstName: string;
      lastName: string;
      phone: string | null;
    } | null;
  } | null;
  _count?: { studentTransports: number };
}

interface Vehicle {
  id: string;
  registration: string;
  make: string;
  model: string;
  driver?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

interface Driver {
  id: string;
  firstName: string;
  lastName: string;
}

interface RoutesClientProps {
  initialRoutes: Route[];
  vehicles: Vehicle[];
  drivers: Driver[];
  canManage: boolean;
}

export default function RoutesClient({
  initialRoutes,
  vehicles,
  drivers,
  canManage,
}: RoutesClientProps) {
  const [routes, setRoutes] = useState<Route[]>(initialRoutes);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    startPoint: "",
    endPoint: "",
    stopsText: "",
    vehicleId: "",
  });

  const openCreateDialog = () => {
    setEditingRoute(null);
    setFormData({
      name: "",
      code: "",
      startPoint: "",
      endPoint: "",
      stopsText: "",
      vehicleId: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (route: Route) => {
    setEditingRoute(route);
    setFormData({
      name: route.name,
      code: route.code,
      startPoint: route.startPoint,
      endPoint: route.endPoint,
      stopsText: route.stops.map((s) => `${s.name}|${s.estimatedTime}`).join("\n"),
      vehicleId: route.vehicleId || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code || !formData.startPoint || !formData.endPoint) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Parse stops
    const stops: Stop[] = formData.stopsText
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        const [name, estimatedTime] = line.split("|").map((s) => s.trim());
        return { name: name || "", estimatedTime: estimatedTime || "" };
      })
      .filter((s) => s.name);

    if (stops.length === 0) {
      toast.error("Please add at least one stop");
      return;
    }

    setSaving(true);
    try {
      const url = editingRoute
        ? `/api/transport/routes/${editingRoute.id}`
        : "/api/transport/routes";
      const method = editingRoute ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          code: formData.code,
          startPoint: formData.startPoint,
          endPoint: formData.endPoint,
          stops,
          vehicleId: formData.vehicleId || null,
        }),
      });

      if (res.ok) {
        toast.success(editingRoute ? "Route updated" : "Route created");
        setDialogOpen(false);
        fetchRoutes();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to save route");
      }
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error("Failed to save route");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (route: Route) => {
    if (!confirm("Are you sure you want to delete this route?")) return;

    try {
      const res = await fetch(`/api/transport/routes/${route.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Route deleted");
        fetchRoutes();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to delete route");
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("Failed to delete route");
    }
  };

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/transport/routes");
      if (res.ok) {
        const data = await res.json();
        setRoutes(data);
      }
    } catch (error) {
      console.error("Failed to fetch routes:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Route
          </Button>
        </div>
      )}

      {routes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No routes found. {canManage && "Create a route to get started."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {routes.map((route) => (
            <Card key={route.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{route.name}</CardTitle>
                    <p className="text-sm text-gray-500">Code: {route.code}</p>
                  </div>
                  {canManage && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(route)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500"
                        onClick={() => handleDelete(route)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-green-500" />
                  <span className="text-gray-600">From:</span>
                  <span>{route.startPoint}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-red-500" />
                  <span className="text-gray-600">To:</span>
                  <span>{route.endPoint}</span>
                </div>

                {route.vehicle && (
                  <div className="flex items-center gap-2 text-sm">
                    <Bus className="h-4 w-4 text-blue-500" />
                    <span className="text-gray-600">Vehicle:</span>
                    <span>
                      {route.vehicle.registration} ({route.vehicle.make} {route.vehicle.model})
                    </span>
                  </div>
                )}

                {route.vehicle?.driver && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-purple-500" />
                    <span className="text-gray-600">Driver:</span>
                    <span>
                      {route.vehicle.driver.firstName} {route.vehicle.driver.lastName}
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t">
                  <p className="text-sm font-medium text-gray-700 mb-2">Stops ({route.stops.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {route.stops.slice(0, 5).map((stop, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 rounded text-xs"
                      >
                        {stop.name}
                      </span>
                    ))}
                    {route.stops.length > 5 && (
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                        +{route.stops.length - 5} more
                      </span>
                    )}
                  </div>
                </div>

                {route._count && (
                  <div className="text-sm text-gray-500">
                    {route._count.studentTransports} students assigned
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRoute ? "Edit Route" : "Create Route"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Route Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Route A - North"
                />
              </div>
              <div>
                <Label>Route Code *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., RA-001"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Point *</Label>
                <Input
                  value={formData.startPoint}
                  onChange={(e) => setFormData({ ...formData, startPoint: e.target.value })}
                  placeholder="e.g., School Campus"
                />
              </div>
              <div>
                <Label>End Point *</Label>
                <Input
                  value={formData.endPoint}
                  onChange={(e) => setFormData({ ...formData, endPoint: e.target.value })}
                  placeholder="e.g., City Center"
                />
              </div>
            </div>

            <div>
              <Label>Vehicle (Optional)</Label>
              <Select
                value={formData.vehicleId}
                onValueChange={(v) => setFormData({ ...formData, vehicleId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No vehicle</SelectItem>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.registration} - {vehicle.make} {vehicle.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Stops (one per line, format: Stop Name|Time)</Label>
              <Textarea
                value={formData.stopsText}
                onChange={(e) => setFormData({ ...formData, stopsText: e.target.value })}
                placeholder="Stop 1|07:00&#10;Stop 2|07:15&#10;Stop 3|07:30"
                rows={5}
              />
              <p className="text-xs text-gray-500 mt-1">
                Example: Main Gate|07:00
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingRoute ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
