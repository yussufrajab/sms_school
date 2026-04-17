"use client";

import { useState, useEffect, useCallback } from "react";
import { UserRole } from "@prisma/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Megaphone,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Paperclip,
  Users,
  Globe,
} from "lucide-react";
import { cn, formatDateTime, getInitials, getRoleLabel } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnnouncementAuthor {
  id: string;
  name: string | null;
  image: string | null;
  role: UserRole;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  targetRole: string | null;
  targetClass: string | null;
  fileUrl: string | null;
  isPublished: boolean;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  author: AnnouncementAuthor;
}

interface AnnouncementsClientProps {
  initialAnnouncements: Announcement[];
  initialTotal: number;
  userRole: UserRole;
  canCreate: boolean;
}

// ─── Role color map ───────────────────────────────────────────────────────────

const roleColors: Record<string, string> = {
  SUPER_ADMIN:
    "bg-purple-100 text-purple-800 border-purple-200",
  SCHOOL_ADMIN:
    "bg-blue-100 text-blue-800 border-blue-200",
  TEACHER:
    "bg-green-100 text-green-800 border-green-200",
  STUDENT:
    "bg-yellow-100 text-yellow-800 border-yellow-200",
  PARENT:
    "bg-orange-100 text-orange-800 border-orange-200",
  LIBRARIAN:
    "bg-teal-100 text-teal-800 border-teal-200",
  ACCOUNTANT:
    "bg-indigo-100 text-indigo-800 border-indigo-200",
};

// ─── Create Announcement Form Schema ─────────────────────────────────────────

const createSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  targetRole: z.string().optional(),
  targetClass: z.string().optional(),
  fileUrl: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
});

type CreateFormData = z.infer<typeof createSchema>;

// ─── Create Announcement Form ─────────────────────────────────────────────────

function CreateAnnouncementForm({
  userRole,
  onSuccess,
}: {
  userRole: UserRole;
  onSuccess: () => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
  });

  const isAdmin = (["SUPER_ADMIN", "SCHOOL_ADMIN"] as UserRole[]).includes(
    userRole
  );

  const onSubmit = async (data: CreateFormData) => {
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          targetRole: data.targetRole || null,
          targetClass: data.targetClass || null,
          fileUrl: data.fileUrl || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(
          Array.isArray(err.error)
            ? err.error.map((e: { message: string }) => e.message).join(", ")
            : err.error ?? "Failed to create announcement"
        );
      }

      toast.success("Announcement published successfully");
      reset();
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create announcement"
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="ann-title">Title *</Label>
        <Input
          id="ann-title"
          placeholder="e.g. School Closure Notice"
          {...register("title")}
        />
        {errors.title && (
          <p className="text-xs text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Content */}
      <div className="space-y-2">
        <Label htmlFor="ann-content">Content *</Label>
        <Textarea
          id="ann-content"
          rows={5}
          placeholder="Write your announcement here..."
          {...register("content")}
        />
        {errors.content && (
          <p className="text-xs text-destructive">{errors.content.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Target Role */}
        <div className="space-y-2">
          <Label>Target Audience</Label>
          <Select onValueChange={(v) => setValue("targetRole", v === "ALL" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Everyone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Everyone</SelectItem>
              <SelectItem value="STUDENT">Students</SelectItem>
              <SelectItem value="TEACHER">Teachers</SelectItem>
              <SelectItem value="PARENT">Parents</SelectItem>
              {isAdmin && (
                <>
                  <SelectItem value="LIBRARIAN">Librarians</SelectItem>
                  <SelectItem value="ACCOUNTANT">Accountants</SelectItem>
                  <SelectItem value="RECEPTIONIST">Receptionists</SelectItem>
                  <SelectItem value="SCHOOL_ADMIN">School Admins</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Target Class */}
        <div className="space-y-2">
          <Label htmlFor="ann-targetClass">Target Class (optional)</Label>
          <Input
            id="ann-targetClass"
            placeholder="e.g. Grade 10"
            {...register("targetClass")}
          />
        </div>
      </div>

      {/* File URL */}
      <div className="space-y-2">
        <Label htmlFor="ann-fileUrl">Attachment URL (optional)</Label>
        <Input
          id="ann-fileUrl"
          type="url"
          placeholder="https://..."
          {...register("fileUrl")}
        />
        {errors.fileUrl && (
          <p className="text-xs text-destructive">{errors.fileUrl.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Publishing...
            </>
          ) : (
            <>
              <Megaphone className="mr-2 h-4 w-4" />
              Publish Announcement
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

// ─── Announcement Card ────────────────────────────────────────────────────────

function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = announcement.content.length > 300;
  const displayContent =
    isLong && !expanded
      ? announcement.content.slice(0, 300) + "..."
      : announcement.content;

  return (
    <Card className="hover:shadow-sm transition-shadow duration-150">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          {/* Author info */}
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-9 w-9 shrink-0">
              {announcement.author.image && (
                <AvatarImage
                  src={announcement.author.image}
                  alt={announcement.author.name ?? ""}
                />
              )}
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {getInitials(announcement.author.name ?? "?")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">
                {announcement.author.name ?? "Unknown"}
              </p>
              <p className="text-xs text-muted-foreground">
                {getRoleLabel(announcement.author.role)} &middot;{" "}
                {formatDateTime(announcement.publishedAt)}
              </p>
            </div>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {announcement.targetRole ? (
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  roleColors[announcement.targetRole] ?? ""
                )}
              >
                <Users className="w-3 h-3 mr-1" />
                {getRoleLabel(announcement.targetRole as UserRole)}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                <Globe className="w-3 h-3 mr-1" />
                Everyone
              </Badge>
            )}
            {announcement.targetClass && (
              <Badge variant="secondary" className="text-xs">
                {announcement.targetClass}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="pt-4 space-y-3">
        {/* Title */}
        <h3 className="font-semibold text-base leading-snug">
          {announcement.title}
        </h3>

        {/* Content */}
        <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {displayContent}
        </div>

        {isLong && (
          <Button
            variant="link"
            size="sm"
            className="p-0 h-auto text-xs"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? "Show less" : "Read more"}
          </Button>
        )}

        {/* Attachment */}
        {announcement.fileUrl && (
          <a
            href={announcement.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <Paperclip className="w-3.5 h-3.5" />
            View Attachment
          </a>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────

export function AnnouncementsClient({
  initialAnnouncements,
  initialTotal,
  userRole,
  canCreate,
}: AnnouncementsClientProps) {
  const [announcements, setAnnouncements] =
    useState<Announcement[]>(initialAnnouncements);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(
    Math.ceil(initialTotal / 20) || 1
  );
  const [createOpen, setCreateOpen] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(search ? { search } : {}),
        ...(roleFilter !== "ALL" ? { targetRole: roleFilter } : {}),
      });

      const res = await fetch(`/api/announcements?${params}`);
      if (!res.ok) throw new Error("Failed to fetch announcements");
      const json = await res.json();
      setAnnouncements(json.data ?? []);
      setTotal(json.pagination?.total ?? 0);
      setTotalPages(json.pagination?.totalPages ?? 1);
    } catch {
      toast.error("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => {
    fetchAnnouncements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, roleFilter]);

  const isAdmin = (["SUPER_ADMIN", "SCHOOL_ADMIN"] as UserRole[]).includes(
    userRole
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            Announcements
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {total} announcement{total !== 1 ? "s" : ""}
          </p>
        </div>

        {canCreate && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Announcement</DialogTitle>
              </DialogHeader>
              <CreateAnnouncementForm
                userRole={userRole}
                onSuccess={() => {
                  setCreateOpen(false);
                  fetchAnnouncements();
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search announcements..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

        {/* Role filter — only admins see this */}
        {isAdmin && (
          <Select
            value={roleFilter}
            onValueChange={(v) => {
              setRoleFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-48">
              <Users className="w-4 h-4 mr-2 shrink-0" />
              <SelectValue placeholder="Audience" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Audiences</SelectItem>
              <SelectItem value="STUDENT">Students</SelectItem>
              <SelectItem value="TEACHER">Teachers</SelectItem>
              <SelectItem value="PARENT">Parents</SelectItem>
              <SelectItem value="LIBRARIAN">Librarians</SelectItem>
              <SelectItem value="ACCOUNTANT">Accountants</SelectItem>
              <SelectItem value="RECEPTIONIST">Receptionists</SelectItem>
              <SelectItem value="SCHOOL_ADMIN">School Admins</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Announcements List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Megaphone className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">No announcements found</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {search || roleFilter !== "ALL"
                ? "Try adjusting your search or filters."
                : canCreate
                ? "Create your first announcement to get started."
                : "No announcements have been published yet."}
            </p>
            {canCreate && !search && roleFilter === "ALL" && (
              <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Announcement
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
              />
            ))}
          </div>

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
        </>
      )}
    </div>
  );
}
