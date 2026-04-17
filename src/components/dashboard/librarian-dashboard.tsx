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
import { cn, getRoleGradient } from "@/lib/utils";
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
  { label: "Catalog", href: "/library/books", icon: BookOpen, iconBg: "bg-indigo-50", iconColor: "text-indigo-600" },
  { label: "Borrow/Return", href: "/library/borrow", icon: BookMarked, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
  { label: "Add Book", href: "/library/books/new", icon: BookPlus, iconBg: "bg-purple-50", iconColor: "text-purple-600" },
  { label: "Members", href: "/library/members", icon: Users, iconBg: "bg-orange-50", iconColor: "text-orange-600" },
  { label: "Fines", href: "/library/fines", icon: DollarSign, iconBg: "bg-red-50", iconColor: "text-red-600" },
  { label: "Reports", href: "/library/reports", icon: TrendingUp, iconBg: "bg-cyan-50", iconColor: "text-cyan-600" },
];

export function LibrarianDashboard({ user, data }: LibrarianDashboardProps) {
  const availabilityRate = data.stats.totalCopies > 0
    ? Math.round((data.stats.availableCopies / data.stats.totalCopies) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-500 p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Library Dashboard</h1>
            <p className="text-purple-100">Manage library resources and borrowing</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white" asChild>
              <Link href="/library/books"><BookOpen className="mr-2 h-4 w-4" />Book Catalog</Link>
            </Button>
            <Button className="bg-white text-purple-600 hover:bg-purple-50 shadow-sm" asChild>
              <Link href="/library/borrow"><BookMarked className="mr-2 h-4 w-4" />Borrow/Return</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-800">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {quickActions.map((action) => (
              <Button
                key={action.href}
                variant="outline"
                className="h-auto py-3 flex-col gap-1.5 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                asChild
              >
                <Link href={action.href}>
                  <div className={cn("flex items-center justify-center w-9 h-9 rounded-xl", action.iconBg)}>
                    <action.icon className={cn("h-4 w-4", action.iconColor)} />
                  </div>
                  <span className="text-xs text-slate-600">{action.label}</span>
                </Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pending Tasks */}
      {data.pendingTasks && data.pendingTasks.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-amber-800">
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
                  className="flex items-center justify-between p-3 rounded-lg bg-amber-100 hover:bg-amber-200 transition-colors"
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
                    <div className="flex items-center gap-2 text-sm text-amber-700">
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
        <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Books</CardTitle>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-purple-50"><BookOpen className="h-4 w-4 text-purple-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{data.stats.totalBooks}</div>
            <p className="text-xs text-slate-500">{data.stats.totalCopies} copies</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Available</CardTitle>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-50"><BookMarked className="h-4 w-4 text-emerald-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{data.stats.availableCopies}</div>
            <Progress value={availabilityRate} className="mt-2 h-2" />
            <p className="text-xs text-slate-500 mt-1">{availabilityRate}% available</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Borrowed</CardTitle>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-50"><Clock className="h-4 w-4 text-amber-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{data.stats.borrowedCopies}</div>
            <p className="text-xs text-slate-500">Currently on loan</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Overdue</CardTitle>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-50"><AlertCircle className="h-4 w-4 text-red-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{data.overdueBooks.length}</div>
            <p className="text-xs text-slate-500">Books overdue</p>
          </CardContent>
        </Card>
      </div>

      {/* Borrowing Trend */}
      {data.borrowingTrend && data.borrowingTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <TrendingUp className="h-5 w-5" />
              Borrowing Trend
            </CardTitle>
            <CardDescription>Daily borrowing and returns over the past 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.borrowingTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tickFormatter={(value) => value.split("-").slice(1).join("/")}
                  />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
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
                <CardTitle className="flex items-center gap-2 text-slate-800">
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
                      className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
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
                <CardTitle className="flex items-center gap-2 text-slate-800">
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
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-purple-50/40 transition-colors"
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
            <CardTitle className="flex items-center gap-2 text-slate-800">
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
                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-purple-50/40 transition-colors"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-50 text-purple-600 font-medium">
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
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <DollarSign className="h-5 w-5" />
              Fines Summary
            </CardTitle>
            <CardDescription>Library fine collection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50/50 hover:bg-slate-100 transition-colors">
                <div>
                  <p className="text-sm text-muted-foreground">Outstanding Fines</p>
                  <p className="text-2xl font-bold text-red-600">
                    ${(data.fines?.totalOutstanding ?? 0).toFixed(2)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-red-500" />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50/50 hover:bg-slate-100 transition-colors">
                <div>
                  <p className="text-sm text-muted-foreground">Collected This Month</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${(data.fines?.collectedThisMonth ?? 0).toFixed(2)}
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
