"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface TimetableEntry {
  id: string;
  dayOfWeek: number;
  periodNo: number;
  startTime: string;
  endTime: string;
  classroom: string | null;
  section: {
    id: string;
    name: string;
    class: { id: string; name: string };
  };
  subject: {
    id: string;
    name: string;
    code: string;
  };
  staff: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface ClassWithSections {
  id: string;
  name: string;
  level: number;
  sections: { id: string; name: string }[];
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
}

interface TimetableManageClientProps {
  classes: ClassWithSections[];
  subjects: Subject[];
  staff: Staff[];
}

const DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

// Color palette for subjects
const SUBJECT_COLORS = [
  "bg-blue-100 border-blue-300 text-blue-800",
  "bg-green-100 border-green-300 text-green-800",
  "bg-purple-100 border-purple-300 text-purple-800",
  "bg-orange-100 border-orange-300 text-orange-800",
  "bg-pink-100 border-pink-300 text-pink-800",
  "bg-teal-100 border-teal-300 text-teal-800",
  "bg-indigo-100 border-indigo-300 text-indigo-800",
  "bg-yellow-100 border-yellow-300 text-yellow-800",
  "bg-red-100 border-red-300 text-red-800",
  "bg-cyan-100 border-cyan-300 text-cyan-800",
];

export default function TimetableManageClient({
  classes,
  subjects,
  staff,
}: TimetableManageClientProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [subjectColorMap, setSubjectColorMap] = useState<Map<string, string>>(new Map());

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    subjectId: "",
    staffId: "",
    dayOfWeek: 1,
    periodNo: 1,
    startTime: "08:00",
    endTime: "08:45",
    classroom: "",
  });

  // Fetch timetable when section changes
  useEffect(() => {
    if (selectedSectionId) {
      fetchTimetable(selectedSectionId);
    }
  }, [selectedSectionId]);

  const fetchTimetable = async (sectionId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/timetable?sectionId=${sectionId}`);
      if (res.ok) {
        const data = await res.json();
        setTimetable(data);
        assignColors(data);
      }
    } catch (error) {
      console.error("Failed to fetch timetable:", error);
    } finally {
      setLoading(false);
    }
  };

  const assignColors = (entries: TimetableEntry[]) => {
    const colorMap = new Map<string, string>();
    const uniqueSubjects = [...new Set(entries.map((e) => e.subject.id))];
    uniqueSubjects.forEach((subjectId, index) => {
      colorMap.set(subjectId, SUBJECT_COLORS[index % SUBJECT_COLORS.length]);
    });
    setSubjectColorMap(colorMap);
  };

  const getEntry = (day: number, period: number): TimetableEntry | undefined => {
    return timetable.find((e) => e.dayOfWeek === day && e.periodNo === period);
  };

  const openAddDialog = (day: number, period: number) => {
    setEditingEntry(null);
    setFormData({
      subjectId: "",
      staffId: "",
      dayOfWeek: day,
      periodNo: period,
      startTime: "08:00",
      endTime: "08:45",
      classroom: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (entry: TimetableEntry) => {
    setEditingEntry(entry);
    setFormData({
      subjectId: entry.subject.id,
      staffId: entry.staff.id,
      dayOfWeek: entry.dayOfWeek,
      periodNo: entry.periodNo,
      startTime: entry.startTime,
      endTime: entry.endTime,
      classroom: entry.classroom || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedSectionId) {
      toast.error("Please select a section first");
      return;
    }

    if (!formData.subjectId || !formData.staffId) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const url = editingEntry
        ? `/api/timetable/${editingEntry.id}`
        : "/api/timetable";
      const method = editingEntry ? "PUT" : "POST";

      const body: Record<string, unknown> = {
        sectionId: selectedSectionId,
        subjectId: formData.subjectId,
        staffId: formData.staffId,
        dayOfWeek: formData.dayOfWeek,
        periodNo: formData.periodNo,
        startTime: formData.startTime,
        endTime: formData.endTime,
      };

      if (formData.classroom) {
        body.classroom = formData.classroom;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(
          editingEntry ? "Timetable entry updated" : "Timetable entry created"
        );
        setDialogOpen(false);
        fetchTimetable(selectedSectionId);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to save timetable entry");
      }
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error("Failed to save timetable entry");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entry: TimetableEntry) => {
    if (!confirm("Are you sure you want to delete this timetable entry?")) {
      return;
    }

    try {
      const res = await fetch(`/api/timetable/${entry.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Timetable entry deleted");
        fetchTimetable(selectedSectionId);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to delete");
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("Failed to delete timetable entry");
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Section</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Class & Section
              </label>
              <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a section" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) =>
                    cls.sections.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        {cls.name} - {section.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timetable Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {selectedSectionId ? "Manage Schedule" : "Weekly Schedule"}
          </CardTitle>
          <p className="text-sm text-gray-500">
            Click on an empty slot to add a period, or click on an existing period to edit
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : !selectedSectionId ? (
            <div className="text-center py-12 text-gray-500">
              Select a section to manage timetable
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border border-gray-300 bg-gray-100 px-3 py-2 text-left text-sm font-medium">
                      Period
                    </th>
                    {DAYS.slice(1, 6).map((day) => (
                      <th
                        key={day}
                        className="border border-gray-300 bg-gray-100 px-3 py-2 text-center text-sm font-medium min-w-[150px]"
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERIODS.map((period) => (
                    <tr key={period}>
                      <td className="border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium">
                        Period {period}
                      </td>
                      {DAYS.slice(1, 6).map((_, dayIndex) => {
                        const entry = getEntry(dayIndex + 1, period);
                        return (
                          <td
                            key={dayIndex}
                            className="border border-gray-300 px-2 py-2"
                          >
                            {entry ? (
                              <div
                                className={`rounded-md p-2 text-xs cursor-pointer hover:opacity-80 transition-opacity group ${
                                  subjectColorMap.get(entry.subject.id) ||
                                  "bg-gray-100 border-gray-300"
                                }`}
                                onClick={() => openEditDialog(entry)}
                              >
                                <div className="font-semibold">{entry.subject.name}</div>
                                <div className="mt-1 opacity-80">
                                  {entry.staff.firstName} {entry.staff.lastName}
                                </div>
                                {entry.classroom && (
                                  <div className="mt-1 opacity-70">
                                    Room: {entry.classroom}
                                  </div>
                                )}
                                <div className="mt-1 opacity-60">
                                  {entry.startTime} - {entry.endTime}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="mt-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 float-right"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(entry);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3 text-red-500" />
                                </Button>
                              </div>
                            ) : (
                              <button
                                className="w-full text-center text-gray-400 text-xs py-4 hover:bg-gray-50 rounded transition-colors"
                                onClick={() => openAddDialog(dayIndex + 1, period)}
                              >
                                <Plus className="h-4 w-4 mx-auto" />
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? "Edit Period" : "Add Period"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Day</Label>
                <Select
                  value={formData.dayOfWeek.toString()}
                  onValueChange={(v) =>
                    setFormData({ ...formData, dayOfWeek: parseInt(v) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.slice(1, 6).map((day, index) => (
                      <SelectItem key={day} value={(index + 1).toString()}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Period</Label>
                <Select
                  value={formData.periodNo.toString()}
                  onValueChange={(v) =>
                    setFormData({ ...formData, periodNo: parseInt(v) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIODS.map((p) => (
                      <SelectItem key={p} value={p.toString()}>
                        Period {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Subject</Label>
              <Select
                value={formData.subjectId}
                onValueChange={(v) => setFormData({ ...formData, subjectId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name} ({subject.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Teacher</Label>
              <Select
                value={formData.staffId}
                onValueChange={(v) => setFormData({ ...formData, staffId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.firstName} {s.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Classroom (Optional)</Label>
              <Input
                placeholder="e.g., Room 101"
                value={formData.classroom}
                onChange={(e) =>
                  setFormData({ ...formData, classroom: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingEntry ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
