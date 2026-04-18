"use client";

import { useState, useEffect } from "react";
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
import { Loader2, Plus, Bus, MapPin, User, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Assignment {
  id: string;
  stopName: string;
  isActive: boolean;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    studentId: string;
    section?: {
      id: string;
      name: string;
      class: { id: string; name: string };
    } | null;
  };
  route: {
    id: string;
    name: string;
    code: string;
    startPoint: string;
    endPoint: string;
    vehicle?: {
      id: string;
      registration: string;
      driver?: {
        id: string;
        firstName: string;
        lastName: string;
        phone: string | null;
      } | null;
    } | null;
  };
}

interface Route {
  id: string;
  name: string;
  code: string;
  stops: Array<{ name: string; estimatedTime: string }>;
  vehicle?: {
    id: string;
    registration: string;
    driver?: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
  } | null;
  _count?: { studentTransports: number };
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  studentId: string;
  section?: {
    id: string;
    name: string;
    class: { id: string; name: string };
  } | null;
}

interface TransportAssignmentsClientProps {
  initialAssignments: Assignment[];
  routes: Route[];
  students: Student[];
  canManage: boolean;
}

export default function TransportAssignmentsClient({
  initialAssignments,
  routes,
  students,
  canManage,
}: TransportAssignmentsClientProps) {
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedRouteId, setSelectedRouteId] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    studentId: "",
    routeId: "",
    stopName: "",
    isActive: true,
  });

  // Fetch assignments when route filter changes
  useEffect(() => {
    fetchAssignments();
  }, [selectedRouteId]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedRouteId && selectedRouteId !== "ALL") params.append("routeId", selectedRouteId);

      const res = await fetch(`/api/transport/assignments?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAssignments(data);
      }
    } catch (error) {
      console.error("Failed to fetch assignments:", error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setFormData({
      studentId: "",
      routeId: "",
      stopName: "",
      isActive: true,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.studentId || !formData.routeId || !formData.stopName) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/transport/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success("Transport assigned successfully");
        setDialogOpen(false);
        fetchAssignments();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to assign transport");
      }
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error("Failed to assign transport");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (assignment: Assignment) => {
    if (!confirm("Are you sure you want to remove this transport assignment?")) return;

    try {
      const res = await fetch(`/api/transport/assignments/${assignment.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Transport assignment removed");
        fetchAssignments();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to remove assignment");
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("Failed to remove assignment");
    }
  };

  // Get stops for selected route
  const selectedRoute = routes.find((r) => r.id === formData.routeId);
  const availableStops = selectedRoute?.stops || [];

  // Filter students by search
  const filteredStudents = students.filter((s) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      s.firstName.toLowerCase().includes(query) ||
      s.lastName.toLowerCase().includes(query) ||
      s.studentId.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="w-64">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Route
              </label>
              <Select value={selectedRouteId} onValueChange={setSelectedRouteId}>
                <SelectTrigger>
                  <SelectValue placeholder="All routes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All routes</SelectItem>
                  {routes.map((route) => (
                    <SelectItem key={route.id} value={route.id}>
                      {route.name} ({route.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {canManage && (
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Assign Transport
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assignments List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : assignments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No transport assignments found. {canManage && "Assign students to routes."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {assignments.map((assignment) => (
            <Card key={assignment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <User className="h-5 w-5 text-purple-500" />
                      <h3 className="font-semibold">
                        {assignment.student.firstName} {assignment.student.lastName}
                      </h3>
                      <span className="text-sm text-gray-500">
                        ({assignment.student.studentId})
                      </span>
                      {assignment.student.section && (
                        <span className="text-sm text-gray-500">
                          {assignment.student.section.class.name} - {assignment.student.section.name}
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          assignment.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {assignment.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Bus className="h-4 w-4 text-blue-500" />
                        Route: {assignment.route.name} ({assignment.route.code})
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-red-500" />
                        Stop: {assignment.stopName}
                      </span>
                    </div>

                    {assignment.route.vehicle && (
                      <div className="mt-2 text-sm text-gray-600">
                        Vehicle: {assignment.route.vehicle.registration}
                        {assignment.route.vehicle.driver && (
                          <span className="ml-2">
                            Driver: {assignment.route.vehicle.driver.firstName}{" "}
                            {assignment.route.vehicle.driver.lastName}
                            {assignment.route.vehicle.driver.phone && (
                              <span className="ml-1">({assignment.route.vehicle.driver.phone})</span>
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {canManage && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500"
                      onClick={() => handleDelete(assignment)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Transport</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Student *</Label>
              <Input
                placeholder="Search by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mb-2"
              />
              <Select
                value={formData.studentId}
                onValueChange={(v) => setFormData({ ...formData, studentId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {filteredStudents.slice(0, 50).map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.firstName} {student.lastName} ({student.studentId})
                      {student.section && ` - ${student.section.class.name} ${student.section.name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Route *</Label>
              <Select
                value={formData.routeId}
                onValueChange={(v) => setFormData({ ...formData, routeId: v, stopName: "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select route" />
                </SelectTrigger>
                <SelectContent>
                  {routes.map((route) => (
                    <SelectItem key={route.id} value={route.id}>
                      {route.name} ({route.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.routeId && (
              <div>
                <Label>Stop *</Label>
                <Select
                  value={formData.stopName}
                  onValueChange={(v) => setFormData({ ...formData, stopName: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select stop" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStops.map((stop, index) => (
                      <SelectItem key={index} value={stop.name}>
                        {stop.name} ({stop.estimatedTime})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
