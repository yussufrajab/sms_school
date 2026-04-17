"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import {
  Plus,
  Search,
  BookOpen,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  BookMarked,
  Library,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookCopy {
  id: string;
  copyNumber: string;
  isAvailable: boolean;
  condition: string;
}

interface Book {
  id: string;
  isbn?: string | null;
  title: string;
  authors: string;
  publisher?: string | null;
  publishYear?: number | null;
  edition?: string | null;
  category?: string | null;
  shelfLocation?: string | null;
  coverUrl?: string | null;
  totalCopies: number;
  availableCopies: number;
  copies: BookCopy[];
  createdAt: string;
}

interface LibraryBooksClientProps {
  initialBooks: Book[];
  initialTotal: number;
  categories: string[];
  userRole: UserRole;
  canManage: boolean;
}

// ─── Add Book Form Schema ─────────────────────────────────────────────────────

const addBookSchema = z.object({
  title: z.string().min(1, "Title is required"),
  authors: z.string().min(1, "Author(s) are required"),
  isbn: z.string().optional(),
  publisher: z.string().optional(),
  publishYear: z.number().int().min(1000).max(new Date().getFullYear() + 1).optional().nullable(),
  edition: z.string().optional(),
  category: z.string().optional(),
  shelfLocation: z.string().optional(),
  totalCopies: z.number().int().min(1, "At least 1 copy required"),
});

type AddBookFormData = z.infer<typeof addBookSchema>;

// ─── Add Book Form ────────────────────────────────────────────────────────────

function AddBookForm({
  categories,
  onSuccess,
}: {
  categories: string[];
  onSuccess: () => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddBookFormData>({
    resolver: zodResolver(addBookSchema),
    defaultValues: { totalCopies: 1 },
  });

  const onSubmit = async (data: AddBookFormData) => {
    try {
      const res = await fetch("/api/library/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(
          Array.isArray(err.error)
            ? err.error.map((e: { message: string }) => e.message).join(", ")
            : err.error ?? "Failed to add book"
        );
      }

      toast.success("Book added successfully");
      reset();
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add book"
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" placeholder="e.g. Introduction to Algorithms" {...register("title")} />
        {errors.title && (
          <p className="text-xs text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Authors */}
      <div className="space-y-2">
        <Label htmlFor="authors">Author(s) *</Label>
        <Input id="authors" placeholder="e.g. Thomas H. Cormen, Charles E. Leiserson" {...register("authors")} />
        {errors.authors && (
          <p className="text-xs text-destructive">{errors.authors.message}</p>
        )}
      </div>

      {/* ISBN */}
      <div className="space-y-2">
        <Label htmlFor="isbn">ISBN</Label>
        <Input id="isbn" placeholder="e.g. 978-0-262-03384-8" {...register("isbn")} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Publisher */}
        <div className="space-y-2">
          <Label htmlFor="publisher">Publisher</Label>
          <Input id="publisher" placeholder="e.g. MIT Press" {...register("publisher")} />
        </div>

        {/* Publish Year */}
        <div className="space-y-2">
          <Label htmlFor="publishYear">Publish Year</Label>
          <Input
            id="publishYear"
            type="number"
            min={1000}
            max={new Date().getFullYear() + 1}
            placeholder={String(new Date().getFullYear())}
            {...register("publishYear")}
          />
          {errors.publishYear && (
            <p className="text-xs text-destructive">{errors.publishYear.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Edition */}
        <div className="space-y-2">
          <Label htmlFor="edition">Edition</Label>
          <Input id="edition" placeholder="e.g. 3rd" {...register("edition")} />
        </div>

        {/* Total Copies */}
        <div className="space-y-2">
          <Label htmlFor="totalCopies">Total Copies *</Label>
          <Input
            id="totalCopies"
            type="number"
            min={1}
            defaultValue={1}
            {...register("totalCopies")}
          />
          {errors.totalCopies && (
            <p className="text-xs text-destructive">{errors.totalCopies.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Category */}
        <div className="space-y-2">
          <Label>Category</Label>
          <Select onValueChange={(v) => setValue("category", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select or type below" />
            </SelectTrigger>
            <SelectContent>
              {[
                "Fiction",
                "Non-Fiction",
                "Science",
                "Mathematics",
                "History",
                "Literature",
                "Technology",
                "Arts",
                "Reference",
                "Biography",
                "Other",
                ...categories.filter(
                  (c) =>
                    ![
                      "Fiction",
                      "Non-Fiction",
                      "Science",
                      "Mathematics",
                      "History",
                      "Literature",
                      "Technology",
                      "Arts",
                      "Reference",
                      "Biography",
                      "Other",
                    ].includes(c)
                ),
              ]
                .filter((v, i, a) => a.indexOf(v) === i)
                .map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {/* Shelf Location */}
        <div className="space-y-2">
          <Label htmlFor="shelfLocation">Shelf Location</Label>
          <Input id="shelfLocation" placeholder="e.g. A-12" {...register("shelfLocation")} />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Add Book
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

// ─── Book Card ────────────────────────────────────────────────────────────────

function BookCard({ book }: { book: Book }) {
  const isFullyAvailable = book.availableCopies === book.totalCopies;
  const isPartiallyAvailable =
    book.availableCopies > 0 && book.availableCopies < book.totalCopies;
  const isUnavailable = book.availableCopies === 0;

  return (
    <Card className="flex flex-col h-full hover:shadow-md transition-shadow duration-200">
      {/* Cover Placeholder */}
      <div
        className={cn(
          "relative h-40 rounded-t-lg flex items-center justify-center overflow-hidden",
          "bg-gradient-to-br from-primary/10 via-primary/5 to-muted"
        )}
      >
        {book.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.coverUrl}
            alt={book.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <BookOpen className="h-12 w-12 opacity-30" />
            <span className="text-xs font-medium opacity-50">No Cover</span>
          </div>
        )}

        {/* Category badge */}
        {book.category && (
          <Badge
            variant="secondary"
            className="absolute top-2 left-2 text-xs font-medium"
          >
            {book.category}
          </Badge>
        )}
      </div>

      <CardContent className="flex flex-col flex-1 p-4 gap-2">
        {/* Title */}
        <h3
          className="font-semibold text-sm leading-tight line-clamp-2"
          title={book.title}
        >
          {book.title}
        </h3>

        {/* Authors */}
        <p className="text-xs text-muted-foreground line-clamp-1" title={book.authors}>
          {book.authors}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto pt-2 border-t">
          {book.publishYear && <span>{book.publishYear}</span>}
          {book.edition && <span>· {book.edition} ed.</span>}
          {book.shelfLocation && (
            <span className="ml-auto font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">
              {book.shelfLocation}
            </span>
          )}
        </div>

        {/* Availability badge */}
        <div className="flex items-center justify-between mt-1">
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              isFullyAvailable &&
                "border-green-500 text-green-700 bg-green-50",
              isPartiallyAvailable &&
                "border-yellow-500 text-yellow-700 bg-yellow-50",
              isUnavailable &&
                "border-red-400 text-red-700 bg-red-50"
            )}
          >
            {isUnavailable
              ? "All Borrowed"
              : `${book.availableCopies} / ${book.totalCopies} Available`}
          </Badge>

          {book.isbn && (
            <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[80px]">
              {book.isbn}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────

export function LibraryBooksClient({
  initialBooks,
  initialTotal,
  categories,
  canManage,
}: LibraryBooksClientProps) {
  const [books, setBooks] = useState<Book[]>(initialBooks);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [availabilityFilter, setAvailabilityFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(
    Math.ceil(initialTotal / 20) || 1
  );
  const [addOpen, setAddOpen] = useState(false);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(search ? { search } : {}),
        ...(categoryFilter !== "ALL" ? { category: categoryFilter } : {}),
        ...(availabilityFilter !== "ALL"
          ? { available: availabilityFilter === "AVAILABLE" ? "true" : "false" }
          : {}),
      });

      const res = await fetch(`/api/library/books?${params}`);
      if (!res.ok) throw new Error("Failed to fetch books");
      const json = await res.json();
      setBooks(json.data ?? []);
      setTotal(json.pagination?.total ?? 0);
      setTotalPages(json.pagination?.totalPages ?? 1);
    } catch {
      toast.error("Failed to load books");
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter, availabilityFilter]);

  useEffect(() => {
    // Skip initial fetch since we have SSR data, but re-fetch on filter changes
    fetchBooks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, categoryFilter, availabilityFilter]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    setPage(1);
  };

  const handleAvailabilityChange = (value: string) => {
    setAvailabilityFilter(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Library className="h-6 w-6 text-primary" />
            Library Books
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {total} book{total !== 1 ? "s" : ""} in the catalogue
          </p>
        </div>

        {canManage && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Book
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Book</DialogTitle>
              </DialogHeader>
              <AddBookForm
                categories={categories}
                onSuccess={() => {
                  setAddOpen(false);
                  fetchBooks();
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, author, ISBN or category..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Category filter */}
            <Select value={categoryFilter} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-full sm:w-44">
                <Filter className="w-4 h-4 mr-2 shrink-0" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Availability filter */}
            <Select
              value={availabilityFilter}
              onValueChange={handleAvailabilityChange}
            >
              <SelectTrigger className="w-full sm:w-44">
                <BookMarked className="w-4 h-4 mr-2 shrink-0" />
                <SelectValue placeholder="Availability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Books</SelectItem>
                <SelectItem value="AVAILABLE">Available</SelectItem>
                <SelectItem value="UNAVAILABLE">Fully Borrowed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Book Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-40 w-full rounded-none" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : books.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">No books found</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {search || categoryFilter !== "ALL" || availabilityFilter !== "ALL"
                ? "Try adjusting your search or filters."
                : canManage
                ? "Get started by adding your first book."
                : "No books have been added to the library yet."}
            </p>
            {canManage && !search && categoryFilter === "ALL" && (
              <Button
                className="mt-4"
                onClick={() => setAddOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Book
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
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
