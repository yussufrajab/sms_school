"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  RefreshCw,
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

type NotificationType = "INFO" | "WARNING" | "SUCCESS" | "ERROR" | "ATTENDANCE" | "ASSIGNMENT" | "EXAM" | "FEE" | "LEAVE" | "ANNOUNCEMENT" | "MESSAGE" | "EVENT";

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

const typeConfig: Record<NotificationType, { icon: React.ElementType; color: string; bgColor: string }> = {
  INFO: { icon: Info, color: "text-blue-600", bgColor: "bg-blue-100" },
  WARNING: { icon: AlertTriangle, color: "text-yellow-600", bgColor: "bg-yellow-100" },
  SUCCESS: { icon: CheckCircle, color: "text-green-600", bgColor: "bg-green-100" },
  ERROR: { icon: XCircle, color: "text-red-600", bgColor: "bg-red-100" },
  ATTENDANCE: { icon: Calendar, color: "text-purple-600", bgColor: "bg-purple-100" },
  ASSIGNMENT: { icon: FileText, color: "text-indigo-600", bgColor: "bg-indigo-100" },
  EXAM: { icon: FileText, color: "text-orange-600", bgColor: "bg-orange-100" },
  FEE: { icon: DollarSign, color: "text-emerald-600", bgColor: "bg-emerald-100" },
  LEAVE: { icon: Clock, color: "text-cyan-600", bgColor: "bg-cyan-100" },
  ANNOUNCEMENT: { icon: Megaphone, color: "text-pink-600", bgColor: "bg-pink-100" },
  MESSAGE: { icon: MessageSquare, color: "text-violet-600", bgColor: "bg-violet-100" },
  EVENT: { icon: Calendar, color: "text-teal-600", bgColor: "bg-teal-100" },
};

export function NotificationsClient({ initialNotifications, initialUnreadCount }: { 
  initialNotifications: Notification[];
  initialUnreadCount: number;
}) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setNotifications(data.data || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleMarkAsRead = async (ids: string[]) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      if (!res.ok) throw new Error("Failed to mark as read");

      setNotifications(prev =>
        prev.map(n => (ids.includes(n.id) ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - ids.length));
      setSelected(new Set());
      toast.success("Marked as read");
    } catch (error) {
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

      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Failed to mark all as read");
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    setSelected(prev => {
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
      setSelected(new Set(filteredNotifications.map(n => n.id)));
    } else {
      setSelected(new Set());
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === "unread") return !n.isRead;
    if (filter === "read") return n.isRead;
    return true;
  });

  const unreadNotifications = notifications.filter(n => !n.isRead);
  const readNotifications = notifications.filter(n => n.isRead);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{notifications.length}</p>
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
                <p className="text-2xl font-bold text-green-600">{notifications.length - unreadCount}</p>
              </div>
              <CheckCheck className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleMarkAsRead(Array.from(selected))}
            >
              <Check className="mr-2 h-4 w-4" />
              Mark {selected.size} as Read
            </Button>
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
        </div>
      </div>

      {/* Notifications List */}
      <Tabs defaultValue="all" onValueChange={(v) => setFilter(v as "all" | "unread" | "read")}>
        <TabsList>
          <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
          <TabsTrigger value="unread">Unread ({unreadNotifications.length})</TabsTrigger>
          <TabsTrigger value="read">Read ({readNotifications.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <NotificationList
            notifications={filteredNotifications}
            selected={selected}
            onSelect={handleSelect}
            onSelectAll={handleSelectAll}
            onMarkAsRead={handleMarkAsRead}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="unread" className="mt-4">
          <NotificationList
            notifications={filteredNotifications}
            selected={selected}
            onSelect={handleSelect}
            onSelectAll={handleSelectAll}
            onMarkAsRead={handleMarkAsRead}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="read" className="mt-4">
          <NotificationList
            notifications={filteredNotifications}
            selected={selected}
            onSelect={handleSelect}
            onSelectAll={handleSelectAll}
            onMarkAsRead={handleMarkAsRead}
            loading={loading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NotificationList({
  notifications,
  selected,
  onSelect,
  onSelectAll,
  onMarkAsRead,
  loading,
}: {
  notifications: Notification[];
  selected: Set<string>;
  onSelect: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onMarkAsRead: (ids: string[]) => void;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Loading notifications...
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
            checked={selected.size === notifications.length && notifications.length > 0}
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
                  onCheckedChange={(checked) => onSelect(notification.id, checked as boolean)}
                />
                <div className={cn("p-2 rounded-full", config.bgColor)}>
                  <Icon className={cn("h-4 w-4", config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={cn("font-medium", !notification.isRead && "text-primary")}>
                        {notification.title}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <Badge variant="default" className="text-xs">New</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
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
                      <Button variant="link" size="sm" className="h-7 text-xs p-0" asChild>
                        <a href={notification.link}>View</a>
                      </Button>
                    )}
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
