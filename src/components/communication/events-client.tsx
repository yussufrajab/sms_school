"use client";

import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  MapPin,
  Clock,
  Loader2,
} from "lucide-react";

type EventCategory = "HOLIDAY" | "EXAM" | "SPORTS" | "CULTURAL" | "MEETING" | "OTHER";
type EventVisibility = "ALL" | "STAFF_ONLY" | "STUDENTS_ONLY";

interface Event {
  id: string;
  schoolId: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  location: string | null;
  category: EventCategory;
  visibility: EventVisibility;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface EventsClientProps {
  initialEvents: Event[];
  userRole: string;
  canManage: boolean;
}

const categoryColors: Record<EventCategory, string> = {
  HOLIDAY: "bg-red-100 text-red-800 border-red-200",
  EXAM: "bg-blue-100 text-blue-800 border-blue-200",
  SPORTS: "bg-green-100 text-green-800 border-green-200",
  CULTURAL: "bg-purple-100 text-purple-800 border-purple-200",
  MEETING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  OTHER: "bg-gray-100 text-gray-800 border-gray-200",
};

const categoryLabels: Record<EventCategory, string> = {
  HOLIDAY: "Holiday",
  EXAM: "Exam",
  SPORTS: "Sports",
  CULTURAL: "Cultural",
  MEETING: "Meeting",
  OTHER: "Other",
};

const visibilityLabels: Record<EventVisibility, string> = {
  ALL: "Everyone",
  STAFF_ONLY: "Staff Only",
  STUDENTS_ONLY: "Students Only",
};

export function EventsClient({ initialEvents, userRole, canManage }: EventsClientProps) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startDate: "",
    startTime: "09:00",
    endDate: "",
    endTime: "17:00",
    location: "",
    category: "OTHER" as EventCategory,
    visibility: "ALL" as EventVisibility,
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => {
      const eventStart = new Date(event.startDate);
      const eventEnd = event.endDate ? new Date(event.endDate) : eventStart;
      return day >= eventStart && day <= eventEnd;
    });
  };

  const visibleEvents = useMemo(() => {
    return events.filter((event) => {
      if (event.visibility === "ALL") return true;
      if (event.visibility === "STAFF_ONLY" && ["TEACHER", "SCHOOL_ADMIN", "SUPER_ADMIN", "ACCOUNTANT", "LIBRARIAN", "RECEPTIONIST", "IT_ADMIN"].includes(userRole)) return true;
      if (event.visibility === "STUDENTS_ONLY" && userRole === "STUDENT") return true;
      return false;
    });
  }, [events, userRole]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return visibleEvents
      .filter((event) => {
        const eventDate = new Date(event.startDate);
        return eventDate >= now && eventDate <= weekFromNow;
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 5);
  }, [visibleEvents]);

  const handleSubmit = async () => {
    if (!formData.title || !formData.startDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingEvent ? `/api/events/${editingEvent.id}` : "/api/events";
      const method = editingEvent ? "PUT" : "POST";

      const startDateTime = formData.startTime
        ? `${formData.startDate}T${formData.startTime}:00`
        : formData.startDate;
      const endDateTime = formData.endDate
        ? formData.endTime
          ? `${formData.endDate}T${formData.endTime}:00`
          : formData.endDate
        : null;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          startDate: startDateTime,
          endDate: endDateTime,
        }),
      });

      if (!response.ok) throw new Error("Failed to save event");

      const savedEvent = await response.json();

      if (editingEvent) {
        setEvents((prev) => prev.map((e) => (e.id === savedEvent.id ? savedEvent : e)));
        toast.success("Event updated successfully");
      } else {
        setEvents((prev) => [...prev, savedEvent]);
        toast.success("Event created successfully");
      }

      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      toast.error("Failed to save event");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      const response = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete event");

      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      toast.success("Event deleted successfully");
    } catch (error) {
      toast.error("Failed to delete event");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      startDate: "",
      startTime: "09:00",
      endDate: "",
      endTime: "17:00",
      location: "",
      category: "OTHER",
      visibility: "ALL",
    });
    setEditingEvent(null);
  };

  const openEditDialog = (event: Event) => {
    const startDate = new Date(event.startDate);
    const endDate = event.endDate ? new Date(event.endDate) : null;

    setFormData({
      title: event.title,
      description: event.description || "",
      startDate: format(startDate, "yyyy-MM-dd"),
      startTime: format(startDate, "HH:mm"),
      endDate: endDate ? format(endDate, "yyyy-MM-dd") : "",
      endTime: endDate ? format(endDate, "HH:mm") : "17:00",
      location: event.location || "",
      category: event.category,
      visibility: event.visibility,
    });
    setEditingEvent(event);
    setIsDialogOpen(true);
  };

  const selectedDateEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold">{format(currentMonth, "MMMM yyyy")}</h2>
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              {canManage && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetForm}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Event
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>{editingEvent ? "Edit Event" : "Create New Event"}</DialogTitle>
                      <DialogDescription>
                        {editingEvent ? "Update the event details below" : "Fill in the event details below"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Title *</label>
                        <Input
                          value={formData.title}
                          onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                          placeholder="Event title"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <Textarea
                          value={formData.description}
                          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                          placeholder="Event description"
                          rows={3}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Start Date *</label>
                          <Input
                            type="date"
                            value={formData.startDate}
                            onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Start Time</label>
                          <Input
                            type="time"
                            value={formData.startTime}
                            onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">End Date</label>
                          <Input
                            type="date"
                            value={formData.endDate}
                            onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">End Time</label>
                          <Input
                            type="time"
                            value={formData.endTime}
                            onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Location</label>
                        <Input
                          value={formData.location}
                          onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                          placeholder="Event location"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Category</label>
                          <Select
                            value={formData.category}
                            onValueChange={(value: EventCategory) => setFormData((prev) => ({ ...prev, category: value }))}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(categoryLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Visibility</label>
                          <Select
                            value={formData.visibility}
                            onValueChange={(value: EventVisibility) => setFormData((prev) => ({ ...prev, visibility: value }))}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(visibilityLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        {editingEvent ? "Update" : "Create"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
              {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="h-24 bg-muted/20 rounded" />
              ))}
              {days.map((day) => {
                const dayEvents = getEventsForDay(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`h-24 p-1 rounded border transition-colors text-left ${
                      isSelected ? "border-primary bg-primary/5" : isToday(day) ? "border-primary/50 bg-primary/5" : "border-transparent hover:bg-muted/50"
                    }`}
                  >
                    <div className="text-sm font-medium mb-1">{format(day, "d")}</div>
                    <div className="space-y-0.5 overflow-hidden">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div key={event.id} className={`text-xs px-1 py-0.5 rounded truncate ${categoryColors[event.category]}`}>
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-muted-foreground px-1">+{dayEvents.length - 2} more</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Selected Date Events */}
        {selectedDate && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{format(selectedDate, "MMMM d, yyyy")}</CardTitle>
              <CardDescription>{selectedDateEvents.length} event(s)</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedDateEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events on this day</p>
              ) : (
                <div className="space-y-3">
                  {selectedDateEvents.map((event) => (
                    <div key={event.id} className="flex items-start justify-between gap-2 p-3 rounded-lg border">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={categoryColors[event.category]} variant="outline">
                            {categoryLabels[event.category]}
                          </Badge>
                        </div>
                        <h4 className="font-medium truncate">{event.title}</h4>
                        {event.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {event.location}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(event.startDate), "h:mm a")}
                          </span>
                        </div>
                      </div>
                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(event)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(event.id)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Events</CardTitle>
            <CardDescription>Next 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming events</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <div className={`w-2 h-2 rounded-full mt-2 ${categoryColors[event.category].split(" ")[0]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.startDate), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}