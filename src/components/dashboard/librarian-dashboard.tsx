"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BookOpen,
  AlertCircle,
  Clock,
  BookMarked,
  TrendingUp,
  DollarSign,
  ArrowRight,
  Target,
  Users,
  BookPlus,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";

interface LibrarianDashboardProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: string;
  };
  data: {
    stats: {
      totalBooks: number;
      totalCopies: number;
      availableCopies: number;
      borrowedCopies: number;
      totalMembers: number;
    };
    overdueBooks: Array<{
      id: string;
      bookTitle: string;
      borrower: string;
      borrowDate: string;
      dueDate: string;
      daysOverdue: number;
      fine: number;
    }>;
    recentBorrows: Array<{
      id: string;
      bookTitle: string;
      borrower: string;
      borrowDate: string;
      dueDate: string;
      status: string;
    }>;
    popularBooks: Array<{
      id: string;
      title: string;
      author: string;
      borrowCount: number;
    }>;
    fines: {
      totalOutstanding: number;
      collectedThisMonth: number;
    };
    pendingTasks?: Array<{
      id: string;
      title: string;
      description: string;
      priority: "high" | "medium" | "low";
      dueDate?: string;
      link?: string;
    }>;
    borrowingTrend?: Array<{
      date: string;
      borrowed: number;
      returned: number;
    }>;
  };
}

const quickActions = [
  { label: "Catalog", href: "/library/books", icon: BookOpen, color: "text-blue-500" },
  { label: "Borrow/Return", href: "/library/borrow", icon: BookMarked, color: "text-green-500" },
  { label: "Add Book", href: "/library/books/new", icon: BookPlus, color: "text-purple-500" },
  { label: "Members", href: "/library/members", icon: Users, color: "text-orange-500" },
  { label: "Fines", href: "/library/fines", icon: DollarSign, color: "text-red-500" },
  { label: "Reports", href: "/library/reports", icon: TrendingUp, color: "text-cyan-500" },
];

export function LibrarianDashboard({ user, data }: LibrarianDashboardProps) {
  const availabilityRate = data.stats.totalCopies > 0
    ? Math.round((data.stats.availableCopies / data.stats.totalCopies) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Library Dashboard</h1>
          <p className="text-muted-foreground">Manage library resources and borrowing</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/library/books">
              <BookOpen className="mr-2 h-4 w-4" />
              Book Catalog
            </Link>
          </Button>
          <Button asChild>
            <Link href="/library/borrow">
              <BookMarked className="mr-2 h-4 w-4" />
              Borrow/Return
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {quickActions.map((action) => (
              <Button
                key={action.href}
                variant="outline"
                className="h-auto py-3 flex-col gap-1"
                asChild
              >
                <Link href={action.href}>
                  <action.icon className={`h-5 w-5 ${action.color}`} />
                  <span className="text-xs">{action.label}</span>
                </Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pending Tasks */}
      {data.pendingTasks && data.pendingTasks.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                <Target className="h-5 w-5" />
                Action Required
              </CardTitle>
              <Badge variant="secondary">{data.pendingTasks.length} items</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2">
              {data.pendingTasks.slice(0, 4).map((task) => (
                <Link
                  href={task.link || "#"}
                  key={task.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-orange-100 dark:bg-orange-900 hover:bg-orange-200 dark:hover:bg-orange-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      task.priority === "high" ? "bg-red-500" :
                      task.priority === "medium" ? "bg-yellow-500" : "bg-green-500"
                    }`} />
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                    </div>
                  </div>
                  {task.dueDate && (
                    <div className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-300">
                      <Clock className="h-4 w-4" />
                      {task.dueDate}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Books</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.totalBooks}</div>
            <p className="text-xs text-muted-foreground">{data.stats.totalCopies} copies</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <BookMarked className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.stats.availableCopies}</div>
            <Progress value={availabilityRate} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">{availabilityRate}% available</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Borrowed</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{data.stats.borrowedCopies}</div>
            <p className="text-xs text-muted-foreground">Currently on loan</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data.overdueBooks.length}</div>
            <p className="text-xs text-muted-foreground">Books overdue</p>
          </CardContent>
        </Card>
      </div>

      {/* Borrowing Trend */}
      {data.borrowingTrend && data.borrowingTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Borrowing Trend
            </CardTitle>
            <CardDescription>Daily borrowing and returns over the past 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.borrowingTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tickFormatter={(value) => value.split("-").slice(1).join("/")}
                  />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="borrowed"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    name="Borrowed"
                  />
                  <Line
                    type="monotone"
                    dataKey="returned"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                    name="Returned"
                  />
                  <Legend />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Overdue Books */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Overdue Books
                </CardTitle>
                <CardDescription>Books past their return date</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/library/borrow?filter=overdue">
                  View All
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.overdueBooks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-2" />
                <p>No overdue books</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3 pr-4">
                  {data.overdueBooks.slice(0, 8).map((book) => (
                    <div
                      key={book.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{book.bookTitle}</p>
                        <p className="text-sm text-muted-foreground">{book.borrower}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="destructive">{book.daysOverdue} days</Badge>
                        <p className="text-sm text-red-600 mt-1">${book.fine.toFixed(2)} fine</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Recent Borrows */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Borrows
                </CardTitle>
                <CardDescription>Latest borrowing activity</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/library/borrow">
                  View All
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.recentBorrows.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-2" />
                <p>No recent borrows</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3 pr-4">
                  {data.recentBorrows.slice(0, 8).map((borrow) => (
                    <div
                      key={borrow.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{borrow.bookTitle}</p>
                        <p className="text-sm text-muted-foreground">{borrow.borrower}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={borrow.status === "active" ? "secondary" : "default"}>
                          {borrow.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">Due: {borrow.dueDate}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Popular Books */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Most Borrowed Books
            </CardTitle>
            <CardDescription>Popular books this term</CardDescription>
          </CardHeader>
          <CardContent>
            {data.popularBooks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No data available
              </div>
            ) : (
              <div className="space-y-3">
                {data.popularBooks.slice(0, 5).map((book, index) => (
                  <div
                    key={book.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{book.title}</p>
                      <p className="text-sm text-muted-foreground">{book.author}</p>
                    </div>
                    <Badge variant="secondary">{book.borrowCount} borrows</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fines Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Fines Summary
            </CardTitle>
            <CardDescription>Library fine collection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div>
                  <p className="text-sm text-muted-foreground">Outstanding Fines</p>
                  <p className="text-2xl font-bold text-red-600">
                    ${data.fines.totalOutstanding.toFixed(2)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-red-500" />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div>
                  <p className="text-sm text-muted-foreground">Collected This Month</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${data.fines.collectedThisMonth.toFixed(2)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
