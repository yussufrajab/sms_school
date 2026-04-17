"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  FileText,
  DollarSign,
  MessageSquare,
  Megaphone,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

type NotificationType =
  | "INFO"
  | "WARNING"
  | "SUCCESS"
  | "ERROR"
  | "ATTENDANCE"
  | "ASSIGNMENT"
  | "EXAM"
  | "FEE"
  | "LEAVE"
  | "ANNOUNCEMENT"
  | "MESSAGE"
  | "EVENT";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

const typeConfig: Record<
  NotificationType,
  { icon: React.ElementType; color: string; bgColor: string }
> = {
  INFO: { icon: Info, color: "text-blue-600", bgColor: "bg-blue-100" },
  WARNING: {
    icon: AlertTriangle,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
  },
  SUCCESS: { icon: CheckCircle, color: "text-green-600", bgColor: "bg-green-100" },
  ERROR: { icon: XCircle, color: "text-red-600", bgColor: "bg-red-100" },
  ATTENDANCE: { icon: Calendar, color: "text-purple-600", bgColor: "bg-purple-100" },
  ASSIGNMENT: { icon: FileText, color: "text-indigo-600", bgColor: "bg-indigo-100" },
  EXAM: { icon: FileText, color: "text-orange-600", bgColor: "bg-orange-100" },
  FEE: { icon: DollarSign, color: "text-emerald-600", bgColor: "bg-emerald-100" },
  LEAVE: { icon: Clock, color: "text-cyan-600", bgColor: "bg-cyan-100" },
  ANNOUNCEMENT: {
    icon: Megaphone,
    color: "text-pink-600",
    bgColor: "bg-pink-100",
  },
  MESSAGE: { icon: MessageSquare, color: "text-violet-600", bgColor: "bg-violet-100" },
  EVENT: { icon: Calendar, color: "text-teal-600", bgColor: "bg-teal-100" },
};

const typeLabels: Record<string, string> = {
  ALL: "All Types",
  INFO: "Info",
  WARNING: "Warning",
  SUCCESS: "Success",
  ERROR: "Error",
  ATTENDANCE: "Attendance",
  ASSIGNMENT: "Assignment",
  EXAM: "Exam",
  FEE: "Fee",
  LEAVE: "Leave",
  ANNOUNCEMENT: "Announcement",
  MESSAGE: "Message",
  EVENT: "Event",
};

export function NotificationsClient({
  initialNotifications,
  initialTotal,
  initialUnreadCount,
}: {
  initialNotifications: Notification[];
  initialTotal: number;
  initialUnreadCount: number;
}) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [total, setTotal] = useState(initialTotal);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(Math.ceil(initialTotal / 20) || 1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    ids: string[];
    title: string;
    description: string;
    deleteAllRead?: boolean;
  }>({ open: false, ids: [], title: "", description: "" });

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(search ? { search } : {}),
        ...(typeFilter !== "ALL" ? { type: typeFilter } : {}),
        ...(filter !== "all" ? { isRead: filter === "read" ? "true" : "false" } : {}),
      });
      const res = await fetch(`/api/notifications?${params}`);
      const json = await res.json();
      setNotifications(json.data ?? []);
      setUnreadCount(json.unreadCount ?? 0);
      setTotal(json.pagination?.total ?? 0);
      setTotalPages(json.pagination?.totalPages ?? 1);
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, filter]);

  useEffect(() => {
    fetchNotifications();
  }, [page, search, typeFilter, filter, fetchNotifications]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, filter]);

  const handleMarkAsRead = async (ids: string[]) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      if (!res.ok) throw new Error("Failed to mark as read");

      setNotifications((prev) =>
        prev.map((n) =>
          ids.includes(n.id)
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - ids.length));
      setSelected(new Set());
      toast.success("Marked as read");
    } catch {
      toast.error("Failed to mark as read");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });

      if (!res.ok) throw new Error("Failed to mark all as read");

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  const handleDelete = async (ids: string[]) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to delete");
      }
      const result = await res.json();

      const deletedUnreadCount = notifications.filter(
        (n) => ids.includes(n.id) && !n.isRead
      ).length;

      setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)));
      setUnreadCount((prev) => Math.max(0, prev - deletedUnreadCount));
      setTotal((prev) => prev - ids.length);
      setSelected(new Set());
      toast.success(result.message);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete notifications"
      );
    }
  };

  const handleDeleteAllRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteAllRead: true }),
      });
      if (!res.ok) throw new Error("Failed to delete read notifications");
      const result = await res.json();
      setNotifications((prev) => prev.filter((n) => !n.isRead));
      setTotal((prev) => prev - result.count);
      toast.success(result.message);
    } catch {
      toast.error("Failed to delete read notifications");
    }
  };

  const confirmDelete = (ids: string[], isBulk: boolean) => {
    setDeleteDialog({
      open: true,
      ids,
      title: isBulk
        ? `Delete ${ids.length} notification${ids.length > 1 ? "s" : ""}?`
        : "Delete notification?",
      description: isBulk
        ? `This will permanently delete ${ids.length} selected notification${ids.length > 1 ? "s" : ""}. This action cannot be undone.`
        : "This will permanently delete this notification. This action cannot be undone.",
    });
  };

  const confirmDeleteAllRead = () => {
    const readCount = total - unreadCount;
    setDeleteDialog({
      open: true,
      ids: [],
      title: "Delete all read notifications?",
      description: `This will permanently delete ${readCount} read notification${readCount !== 1 ? "s" : ""}. This action cannot be undone.`,
      deleteAllRead: true,
    });
  };

  const handleSelect = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelected(new Set(notifications.map((n) => n.id)));
    } else {
      setSelected(new Set());
    }
  };

  const readCount = total - unreadCount;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{total}</p>
              </div>
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unread</p>
                <p className="text-2xl font-bold text-blue-600">{unreadCount}</p>
              </div>
              <BellOff className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Read</p>
                <p className="text-2xl font-bold text-green-600">{readCount}</p>
              </div>
              <CheckCheck className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search notifications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(typeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMarkAsRead(Array.from(selected))}
              >
                <Check className="mr-2 h-4 w-4" />
                Mark {selected.size} as Read
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => confirmDelete(Array.from(selected), true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete {selected.size}
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchNotifications}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Button size="sm" onClick={handleMarkAllAsRead}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark All as Read
            </Button>
          )}
          {readCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={confirmDeleteAllRead}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete All Read
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <Tabs
        defaultValue="all"
        onValueChange={(v) => setFilter(v as "all" | "unread" | "read")}
      >
        <TabsList>
          <TabsTrigger value="all">All ({total})</TabsTrigger>
          <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
          <TabsTrigger value="read">Read ({readCount})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <NotificationList
            notifications={notifications}
            selected={selected}
            onSelect={handleSelect}
            onSelectAll={handleSelectAll}
            onMarkAsRead={handleMarkAsRead}
            onDelete={confirmDelete}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="unread" className="mt-4">
          <NotificationList
            notifications={notifications}
            selected={selected}
            onSelect={handleSelect}
            onSelectAll={handleSelectAll}
            onMarkAsRead={handleMarkAsRead}
            onDelete={confirmDelete}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="read" className="mt-4">
          <NotificationList
            notifications={notifications}
            selected={selected}
            onSelect={handleSelect}
            onSelectAll={handleSelectAll}
            onMarkAsRead={handleMarkAsRead}
            onDelete={confirmDelete}
            loading={loading}
          />
        </TabsContent>
      </Tabs>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} &mdash; {total} total
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog((prev) => ({ ...prev, open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteDialog.deleteAllRead) {
                  handleDeleteAllRead();
                } else {
                  handleDelete(deleteDialog.ids);
                }
                setDeleteDialog((prev) => ({ ...prev, open: false }));
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function NotificationList({
  notifications,
  selected,
  onSelect,
  onSelectAll,
  onMarkAsRead,
  onDelete,
  loading,
}: {
  notifications: Notification[];
  selected: Set<string>;
  onSelect: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onMarkAsRead: (ids: string[]) => void;
  onDelete: (ids: string[], isBulk: boolean) => void;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No notifications</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="border-b px-4 py-2 flex items-center gap-2">
          <Checkbox
            checked={
              selected.size === notifications.length && notifications.length > 0
            }
            onCheckedChange={onSelectAll}
          />
          <span className="text-sm text-muted-foreground">Select all</span>
        </div>
        <div className="divide-y">
          {notifications.map((notification) => {
            const config = typeConfig[notification.type];
            const Icon = config.icon;

            return (
              <div
                key={notification.id}
                className={cn(
                  "flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors",
                  !notification.isRead && "bg-blue-50/50"
                )}
              >
                <Checkbox
                  checked={selected.has(notification.id)}
                  onCheckedChange={(checked) =>
                    onSelect(notification.id, checked as boolean)
                  }
                />
                <div className={cn("p-2 rounded-full", config.bgColor)}>
                  <Icon className={cn("h-4 w-4", config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p
                        className={cn(
                          "font-medium",
                          !notification.isRead && "text-primary"
                        )}
                      >
                        {notification.title}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <Badge variant="default" className="text-xs">
                        New
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => onMarkAsRead([notification.id])}
                      >
                        Mark as read
                      </Button>
                    )}
                    {notification.link && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-7 text-xs p-0"
                        asChild
                      >
                        <a href={notification.link}>View</a>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => onDelete([notification.id], false)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}