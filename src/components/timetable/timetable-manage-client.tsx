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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  Plus,
  Trash2,
  Calendar,
  Clock,
  BookOpen,
  User,
  MapPin,
  Eye,
  Pencil,
} from "lucide-react";
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

const DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

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
  const [showSaturday, setShowSaturday] = useState(false);

  // Dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteEntry, setDeleteEntry] = useState<TimetableEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  // View dialog
  const [viewEntry, setViewEntry] = useState<TimetableEntry | null>(null);

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
      toast.error("Failed to load timetable");
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
      startTime: period <= 4 ? `0${7 + period}:00` : `${7 + period}:00`,
      endTime: period <= 4 ? `0${7 + period}:45` : `${7 + period}:45`,
      classroom: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (entry: TimetableEntry) => {
    setViewEntry(null);
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
        toast.success(editingEntry ? "Timetable entry updated" : "Timetable entry created");
        setDialogOpen(false);
        fetchTimetable(selectedSectionId);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to save timetable entry");
      }
    } catch {
      toast.error("Failed to save timetable entry");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteEntry) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/timetable/${deleteEntry.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Timetable entry deleted");
        setDeleteEntry(null);
        fetchTimetable(selectedSectionId);
      } else {
        toast.error("Failed to delete entry");
      }
    } catch {
      toast.error("Failed to delete timetable entry");
    } finally {
      setDeleting(false);
    }
  };

  const handleClearAll = async () => {
    if (!selectedSectionId) return;
    setClearing(true);
    try {
      // Delete all entries for this section one by one
      const entries = timetable.filter((e) => e.section.id === selectedSectionId);
      await Promise.all(
        entries.map((entry) =>
          fetch(`/api/timetable/${entry.id}`, { method: "DELETE" })
        )
      );
      toast.success(`Cleared ${entries.length} timetable entries`);
      setClearAllOpen(false);
      fetchTimetable(selectedSectionId);
    } catch {
      toast.error("Failed to clear timetable");
    } finally {
      setClearing(false);
    }
  };

  const activeDays = showSaturday ? DAYS.slice(1, 7) : DAYS.slice(1, 6);
  const selectedSection = classes
    .flatMap((c) => c.sections.map((s) => ({ ...s, className: c.name })))
    .find((s) => s.id === selectedSectionId);

  const uniqueSubjects = new Set(timetable.map((e) => e.subject.id));
  const uniqueTeachers = new Set(timetable.map((e) => e.staff.id));

  return (
    <div className="space-y-6">
      {/* Header & Section Selection */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-sm font-medium mb-1 block">Class & Section</label>
            <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
              <SelectTrigger className="w-[220px]">
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

          <div className="flex items-center gap-2 pb-1">
            <Switch checked={showSaturday} onCheckedChange={setShowSaturday} />
            <Label className="text-sm">Show Saturday</Label>
          </div>
        </div>

        {selectedSectionId && timetable.length > 0 && (
          <Button variant="outline" className="text-destructive" onClick={() => setClearAllOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      {/* Stats */}
      {selectedSectionId && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{timetable.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Subjects</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{uniqueSubjects.size}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Teachers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{uniqueTeachers.size}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {activeDays.length * PERIODS.length > 0
                  ? Math.round((timetable.length / (activeDays.length * PERIODS.length)) * 100)
                  : 0}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Timetable Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {selectedSectionId
              ? `${selectedSection?.className ?? ""} - ${selectedSection?.name ?? ""} Schedule`
              : "Weekly Schedule"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {selectedSectionId
              ? "Click an empty slot to add, or click a period to view/edit"
              : "Select a section to manage timetable"}
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !selectedSectionId ? (
            <div className="text-center py-12 text-muted-foreground">
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
                    {activeDays.map((day) => (
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
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          Period {period}
                        </div>
                      </td>
                      {activeDays.map((_, dayIndex) => {
                        const dayNum = dayIndex + 1;
                        const entry = getEntry(dayNum, period);
                        return (
                          <td key={dayIndex} className="border border-gray-300 px-2 py-2">
                            {entry ? (
                              <div
                                className={`rounded-md p-2 text-xs cursor-pointer hover:opacity-80 transition-opacity group border ${
                                  subjectColorMap.get(entry.subject.id) ||
                                  "bg-gray-100 border-gray-300"
                                }`}
                                onClick={() => setViewEntry(entry)}
                              >
                                <div className="font-semibold">{entry.subject.name}</div>
                                <div className="mt-1 opacity-80">
                                  {entry.staff.firstName} {entry.staff.lastName}
                                </div>
                                {entry.classroom && (
                                  <div className="mt-1 opacity-70 flex items-center gap-1">
                                    <MapPin className="h-2.5 w-2.5" />
                                    {entry.classroom}
                                  </div>
                                )}
                                <div className="mt-1 opacity-60">
                                  {entry.startTime} - {entry.endTime}
                                </div>
                                <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0"
                                    onClick={(e) => { e.stopPropagation(); openEditDialog(entry); }}
                                  >
                                    <Pencil className="h-2.5 w-2.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 text-red-500"
                                    onClick={(e) => { e.stopPropagation(); setDeleteEntry(entry); }}
                                  >
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <button
                                className="w-full text-center text-gray-400 text-xs py-4 hover:bg-gray-50 rounded transition-colors"
                                onClick={() => openAddDialog(dayNum, period)}
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

      {/* Subject Legend */}
      {timetable.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Subject Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Array.from(subjectColorMap.entries()).map(([subjectId, color]) => {
                const entry = timetable.find((e) => e.subject.id === subjectId);
                const count = timetable.filter((e) => e.subject.id === subjectId).length;
                return (
                  <div key={subjectId} className={`px-3 py-1 rounded-md text-sm border ${color}`}>
                    {entry?.subject.name} ({count})
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Entry Dialog */}
      <Dialog open={!!viewEntry} onOpenChange={() => setViewEntry(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Period Details</DialogTitle>
          </DialogHeader>
          {viewEntry && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-start gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Subject</p>
                    <p className="text-sm font-medium">{viewEntry.subject.name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Teacher</p>
                    <p className="text-sm font-medium">{viewEntry.staff.firstName} {viewEntry.staff.lastName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Day</p>
                    <p className="text-sm font-medium">{DAYS[viewEntry.dayOfWeek]}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Time</p>
                    <p className="text-sm font-medium">Period {viewEntry.periodNo} ({viewEntry.startTime} - {viewEntry.endTime})</p>
                  </div>
                </div>
                {viewEntry.classroom && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Classroom</p>
                      <p className="text-sm font-medium">{viewEntry.classroom}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Class</p>
                    <p className="text-sm font-medium">{viewEntry.section.class.name} - {viewEntry.section.name}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => { const e = viewEntry; setViewEntry(null); openEditDialog(e); }}>
                  <Pencil className="w-4 h-4 mr-1" /> Edit
                </Button>
                <Button variant="outline" size="sm" className="text-destructive" onClick={() => { const e = viewEntry; setViewEntry(null); setDeleteEntry(e); }}>
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEntry ? "Edit Period" : "Add Period"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Day</Label>
                <Select value={formData.dayOfWeek.toString()} onValueChange={(v) => setFormData({ ...formData, dayOfWeek: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {activeDays.map((day, index) => (
                      <SelectItem key={day} value={(index + 1).toString()}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Period</Label>
                <Select value={formData.periodNo.toString()} onValueChange={(v) => setFormData({ ...formData, periodNo: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERIODS.map((p) => (
                      <SelectItem key={p} value={p.toString()}>Period {p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Subject *</Label>
              <Select value={formData.subjectId} onValueChange={(v) => setFormData({ ...formData, subjectId: v })}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>{subject.name} ({subject.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Teacher *</Label>
              <Select value={formData.staffId} onValueChange={(v) => setFormData({ ...formData, staffId: v })}>
                <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} />
              </div>
            </div>

            <div>
              <Label>Classroom (Optional)</Label>
              <Input placeholder="e.g., Room 101" value={formData.classroom} onChange={(e) => setFormData({ ...formData, classroom: e.target.value })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingEntry ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Entry Confirmation */}
      <AlertDialog open={!!deleteEntry} onOpenChange={() => setDeleteEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Timetable Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{deleteEntry?.subject?.name}</strong> ({DAYS[deleteEntry?.dayOfWeek ?? 0]} Period {deleteEntry?.periodNo}) from the schedule?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear All Confirmation */}
      <AlertDialog open={clearAllOpen} onOpenChange={setClearAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Timetable Entries</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all {timetable.length} timetable entries for this section. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll} disabled={clearing} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {clearing ? "Clearing..." : "Clear All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}