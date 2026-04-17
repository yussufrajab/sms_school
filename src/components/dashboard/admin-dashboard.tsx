"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  GraduationCap,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Activity,
  Calendar,
  UserPlus,
  FileText,
  Bell,
  Settings,
  ClipboardCheck,
  BookOpen,
  Clock,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { UserRole } from "@prisma/client";
import { getRoleGradient, getRoleColor, CHART_COLORS } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface AdminDashboardProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: string;
  };
  data: {
    stats: {
      totalStudents: number;
      totalStaff: number;
      totalClasses: number;
      attendanceRate: number;
    };
    enrollmentTrend: Array<{
      month: string;
      students: number;
    }>;
    attendanceData: Array<{
      day: string;
      present: number;
      absent: number;
    }>;
    feeCollection: {
      collected: number;
      pending: number;
      total: number;
    };
    recentActivity: Array<{
      id: string;
      action: string;
      user: string;
      timestamp: string;
      type: string;
    }>;
    upcomingEvents: Array<{
      id: string;
      title: string;
      date: string;
      type: string;
    }>;
    alerts: Array<{
      id: string;
      message: string;
      type: string;
      count: number;
    }>;
    pendingTasks?: Array<{
      id: string;
      title: string;
      description: string;
      priority: "high" | "medium" | "low";
      dueDate?: string;
      link?: string;
    }>;
  };
}

const COLORS = ["#10b981", "#f59e0b", "#ef4444"];

const quickActions = [
  { label: "Add Student", href: "/students", icon: UserPlus, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
  { label: "Add Staff", href: "/staff", icon: Users, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
  { label: "New Class", href: "/academic/classes", icon: BookOpen, iconBg: "bg-purple-50", iconColor: "text-purple-600" },
  { label: "Attendance", href: "/attendance", icon: ClipboardCheck, iconBg: "bg-orange-50", iconColor: "text-orange-600" },
  { label: "Announcement", href: "/communication/announcements", icon: Bell, iconBg: "bg-pink-50", iconColor: "text-pink-600" },
  { label: "Reports", href: "/reports", icon: FileText, iconBg: "bg-cyan-50", iconColor: "text-cyan-600" },
  { label: "Settings", href: "/settings", icon: Settings, iconBg: "bg-slate-100", iconColor: "text-slate-600" },
  { label: "Audit Logs", href: "/admin/audit-logs", icon: Activity, iconBg: "bg-indigo-50", iconColor: "text-indigo-600" },
];

const actionColors: Record<string, string> = {
  CREATE: "bg-emerald-100 text-emerald-700",
  UPDATE: "bg-sky-100 text-sky-700",
  DELETE: "bg-red-100 text-red-700",
  LOGIN: "bg-purple-100 text-purple-700",
  LOGOUT: "bg-slate-100 text-slate-700",
  EXPORT: "bg-cyan-100 text-cyan-700",
};

const tooltipStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
};

export function AdminDashboard({ user, data }: AdminDashboardProps) {
  const collectionPercentage = data.feeCollection.total > 0
    ? Math.round((data.feeCollection.collected / data.feeCollection.total) * 100)
    : 0;

  const pieData = [
    { name: "Collected", value: data.feeCollection.collected },
    { name: "Pending", value: data.feeCollection.pending },
    { name: "Overdue", value: 0 },
  ];

  const getDaysUntil = (dateStr: string): number => {
    const eventDate = new Date(dateStr);
    const today = new Date();
    const diffTime = eventDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatRelativeTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const role = (user.role ?? "SUPER_ADMIN") as UserRole;

  return (
    <div className="space-y-6">
      {/* Welcome Header with gradient */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-indigo-100">Welcome back, {user.name?.split(" ")[0] || "Admin"}! Here&apos;s your school overview.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white" asChild>
              <Link href="/reports">
                <TrendingUp className="mr-2 h-4 w-4" />
                Reports
              </Link>
            </Button>
            <Button className="bg-white text-indigo-600 hover:bg-indigo-50 shadow-sm" asChild>
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
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
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.href}
                variant="outline"
                className="h-auto py-3 flex-col gap-1.5 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                asChild
              >
                <Link href={action.href}>
                  <div className={`flex items-center justify-center w-9 h-9 rounded-xl ${action.iconBg}`}>
                    <action.icon className={`h-4 w-4 ${action.iconColor}`} />
                  </div>
                  <span className="text-xs text-slate-600">{action.label}</span>
                </Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-indigo-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Students</CardTitle>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-50">
              <GraduationCap className="h-4 w-4 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{data.stats.totalStudents}</div>
            <p className="text-xs text-slate-500">Active enrollment</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Staff</CardTitle>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-50">
              <Users className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{data.stats.totalStaff}</div>
            <p className="text-xs text-slate-500">Teachers & staff</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-sky-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Attendance Rate</CardTitle>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-sky-50">
              <Activity className="h-4 w-4 text-sky-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{data.stats.attendanceRate}%</div>
            <Progress value={data.stats.attendanceRate} className="mt-2 h-2" />
            <p className="text-xs text-slate-500 mt-1">Today&apos;s average</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Fee Collection</CardTitle>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-50">
              <DollarSign className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{collectionPercentage}%</div>
            <Progress value={collectionPercentage} className="mt-2 h-2" />
            <p className="text-xs text-slate-500 mt-1">
              ${data.feeCollection.collected.toLocaleString()} collected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="h-5 w-5" />
              Alerts & Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-3">
              {data.alerts.map((alert) => (
                <Link
                  href={alert.type === "error" ? "/finance/invoices?status=overdue" : "/attendance"}
                  key={alert.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-amber-100 hover:bg-amber-200 transition-colors cursor-pointer"
                >
                  <span className="text-sm text-amber-900">{alert.message}</span>
                  <Badge variant="secondary">{alert.count}</Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Tasks */}
      {data.pendingTasks && data.pendingTasks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <CheckCircle2 className="h-5 w-5 text-indigo-500" />
                Pending Tasks
              </CardTitle>
              <Badge variant="secondary">{data.pendingTasks.length} tasks</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.pendingTasks.slice(0, 4).map((task) => (
                <Link
                  href={task.link || "#"}
                  key={task.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-indigo-50/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      task.priority === "high" ? "bg-red-500" :
                      task.priority === "medium" ? "bg-amber-500" : "bg-emerald-500"
                    }`} />
                    <div>
                      <p className="font-medium text-slate-800">{task.title}</p>
                      <p className="text-sm text-slate-500">{task.description}</p>
                    </div>
                  </div>
                  {task.dueDate && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Enrollment Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-800">Enrollment Trend</CardTitle>
            <CardDescription>Student enrollment over the past 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.enrollmentTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fill: "#64748b" }} />
                  <YAxis className="text-xs" tick={{ fill: "#64748b" }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="students"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ fill: "#6366f1", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-800">Weekly Attendance</CardTitle>
            <CardDescription>Attendance overview for this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" className="text-xs" tick={{ fill: "#64748b" }} />
                  <YAxis className="text-xs" tick={{ fill: "#64748b" }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="present" fill="#10b981" name="Present" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="absent" fill="#ef4444" name="Absent" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <Activity className="h-5 w-5 text-indigo-500" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest system activities</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700" asChild>
                <Link href="/admin/audit-logs">
                  View All
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                No recent activity
              </div>
            ) : (
              <ScrollArea className="h-[350px]">
                <div className="space-y-2 pr-4">
                  {data.recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:bg-indigo-50/40 transition-colors"
                    >
                      <div className={`mt-0.5 px-2 py-0.5 rounded text-xs font-semibold ${
                        actionColors[activity.action] || "bg-slate-100 text-slate-700"
                      }`}>
                        {activity.action}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 truncate">{activity.type}</p>
                        <p className="text-sm text-slate-500">{activity.user}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-slate-400">
                          {formatRelativeTime(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <Calendar className="h-5 w-5 text-indigo-500" />
                  Upcoming Events
                </CardTitle>
                <CardDescription>School events</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-indigo-600" asChild>
                <Link href="/communication/events">All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.upcomingEvents.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                No upcoming events
              </div>
            ) : (
              <ScrollArea className="h-[350px]">
                <div className="space-y-2 pr-4">
                  {data.upcomingEvents.map((event) => {
                    const daysUntil = getDaysUntil(event.date);
                    return (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:bg-indigo-50/40 transition-colors"
                      >
                        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                          <span className="text-xs font-medium">
                            {new Date(event.date).toLocaleDateString("en-US", { month: "short" })}
                          </span>
                          <span className="text-lg font-bold">
                            {new Date(event.date).getDate()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 truncate">{event.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs border-slate-200 text-slate-600">
                              {event.type}
                            </Badge>
                            {daysUntil <= 7 && daysUntil > 0 && (
                              <span className="text-xs text-orange-500 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {daysUntil === 1 ? "Tomorrow" : `In ${daysUntil} days`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fee Collection Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-800">Fee Collection Overview</CardTitle>
          <CardDescription>Distribution of fee collection status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [`${Number(value).toLocaleString()}`, ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col justify-center gap-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-sm text-slate-700">Collected</span>
                </div>
                <span className="font-medium text-slate-900">${data.feeCollection.collected.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-sm text-slate-700">Pending</span>
                </div>
                <span className="font-medium text-slate-900">${data.feeCollection.pending.toLocaleString()}</span>
              </div>
              <Button variant="outline" className="w-full border-slate-200" asChild>
                <Link href="/finance/invoices">
                  <DollarSign className="mr-2 h-4 w-4" />
                  View All Invoices
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}