"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, getRoleGradient, CHART_COLORS } from "@/lib/utils";
import { UserRole } from "@prisma/client";
import {
  Users,
  BookOpen,
  ClipboardCheck,
  FileText,
  Clock,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Plus,
  MessageSquare,
  BarChart3,
  UserCheck,
  Bell,
} from "lucide-react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from "recharts";

interface TeacherDashboardProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: string;
  };
  data: {
    assignedClasses: Array<{
      id: string;
      name: string;
      section: string;
      subject: string;
      studentCount: number;
    }>;
    todaySchedule: Array<{
      id: string;
      period: number;
      subject: string;
      class: string;
      section: string;
      time: string;
    }>;
    pendingAssignments: Array<{
      id: string;
      title: string;
      class: string;
      dueDate: string;
      submissions: number;
      total: number;
    }>;
    attendanceToday: {
      marked: number;
      total: number;
    };
    recentSubmissions: Array<{
      id: string;
      student: string;
      assignment: string;
      submittedAt: string;
      status: string;
    }>;
    pendingTasks?: Array<{
      id: string;
      title: string;
      description: string;
      priority: "high" | "medium" | "low";
      dueDate?: string;
      link?: string;
    }>;
    weeklyAttendance?: Array<{
      day: string;
      rate: number;
    }>;
  };
}

const quickActions = [
  { label: "Mark Attendance", href: "/attendance", icon: ClipboardCheck, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
  { label: "New Assignment", href: "/academic/assignments", icon: Plus, iconBg: "bg-indigo-50", iconColor: "text-indigo-600" },
  { label: "View Results", href: "/examinations", icon: BarChart3, iconBg: "bg-purple-50", iconColor: "text-purple-600" },
  { label: "Messages", href: "/communication/messages", icon: MessageSquare, iconBg: "bg-orange-50", iconColor: "text-orange-600" },
  { label: "Timetable", href: "/academic/timetable", icon: Calendar, iconBg: "bg-sky-50", iconColor: "text-sky-600" },
  { label: "Announcements", href: "/communication/announcements", icon: Bell, iconBg: "bg-pink-50", iconColor: "text-pink-600" },
];

export function TeacherDashboard({ user, data }: TeacherDashboardProps) {
  const attendancePercentage = data.attendanceToday.total > 0
    ? Math.round((data.attendanceToday.marked / data.attendanceToday.total) * 100)
    : 0;

  const totalStudents = data.assignedClasses.reduce((sum, c) => sum + c.studentCount, 0);

  // Calculate pending submissions count
  const pendingSubmissionsCount = data.pendingAssignments.reduce(
    (sum, a) => sum + (a.total - a.submissions),
    0
  );

  // Radial chart data for attendance
  const attendanceData = [
    {
      name: "Attendance",
      value: attendancePercentage,
      fill: attendancePercentage >= 80 ? "#22c55e" : attendancePercentage >= 60 ? "#f59e0b" : "#ef4444",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {user.name?.split(" ")[0] || "Teacher"}!</h1>
            <p className="text-emerald-100">Here&apos;s your teaching overview for today</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white" asChild>
              <Link href="/attendance">
                <ClipboardCheck className="mr-2 h-4 w-4" />
                Mark Attendance
              </Link>
            </Button>
            <Button className="bg-white text-emerald-600 hover:bg-emerald-50 shadow-sm" asChild>
              <Link href="/academic/assignments">
                <Plus className="mr-2 h-4 w-4" />
                New Assignment
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

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Assigned Classes</CardTitle>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-50"><BookOpen className="h-4 w-4 text-emerald-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{data.assignedClasses.length}</div>
            <p className="text-xs text-slate-500">Across all subjects</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Students</CardTitle>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-50"><Users className="h-4 w-4 text-indigo-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{totalStudents}</div>
            <p className="text-xs text-slate-500">In your classes</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-sky-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Attendance Today</CardTitle>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-sky-50"><ClipboardCheck className="h-4 w-4 text-sky-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold text-slate-900">{attendancePercentage}%</div>
              <div className="h-12 w-12">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    innerRadius="70%"
                    outerRadius="100%"
                    data={attendanceData}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <RadialBar dataKey="value" cornerRadius={10} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {data.attendanceToday.marked} of {data.attendanceToday.total} classes
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Pending Reviews</CardTitle>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-50"><AlertCircle className="h-4 w-4 text-amber-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{data.pendingAssignments.length}</div>
            <p className="text-xs text-slate-500">
              {pendingSubmissionsCount} submissions to grade
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Tasks */}
      {data.pendingTasks && data.pendingTasks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <CheckCircle2 className="h-5 w-5" />
                Pending Tasks
              </CardTitle>
              <Badge variant="secondary">{data.pendingTasks.length} tasks</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2">
              {data.pendingTasks.slice(0, 4).map((task) => (
                <Link
                  href={task.link || "#"}
                  key={task.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-indigo-50/40 transition-colors"
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
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's Schedule */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <Calendar className="h-5 w-5" />
                  Today&apos;s Schedule
                </CardTitle>
                <CardDescription>Your teaching schedule for today</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/academic/timetable">
                  Full Timetable
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.todaySchedule.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No classes scheduled for today
              </div>
            ) : (
              <div className="relative">
                {/* Timeline */}
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200" />
                <div className="space-y-4">
                  {data.todaySchedule.map((schedule, index) => (
                    <div key={schedule.id} className="relative flex items-start gap-4">
                      {/* Timeline dot */}
                      <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-emerald-600 text-white font-medium text-sm shadow-sm">
                        {schedule.period}
                      </div>
                      <div className="flex-1 p-3 rounded-lg bg-slate-50/50 hover:bg-slate-100 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{schedule.subject}</p>
                            <p className="text-sm text-muted-foreground">
                              {schedule.class} - {schedule.section}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {schedule.time}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <UserCheck className="h-5 w-5" />
              Weekly Attendance
            </CardTitle>
            <CardDescription>Class attendance rate this week</CardDescription>
          </CardHeader>
          <CardContent>
            {data.weeklyAttendance && data.weeklyAttendance.length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.weeklyAttendance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="day" className="text-xs" />
                    <YAxis domain={[0, 100]} className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                      }}
                      formatter={(value) => [`${value}%`, "Attendance"]}
                    />
                    <Bar
                      dataKey="rate"
                      fill="#6366f1"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No attendance data available
              </div>
            )}
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link href="/attendance">
                <ClipboardCheck className="mr-2 h-4 w-4" />
                Mark Today&apos;s Attendance
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Assignments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <FileText className="h-5 w-5" />
                  Pending Assignments
                </CardTitle>
                <CardDescription>Assignments awaiting review</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/academic/assignments">
                  View All
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.pendingAssignments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-2" />
                <p>All caught up! No pending assignments.</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2 pr-4">
                  {data.pendingAssignments.map((assignment) => {
                    const progressPercentage = assignment.total > 0
                      ? Math.round((assignment.submissions / assignment.total) * 100)
                      : 0;
                    return (
                      <Link
                        key={assignment.id}
                        href={`/academic/assignments/${assignment.id}/submissions`}
                        className="block p-3 rounded-lg border border-slate-100 hover:bg-indigo-50/40 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">{assignment.title}</p>
                          <Badge variant="secondary">{assignment.class}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={progressPercentage} className="flex-1 h-2" />
                          <span className="text-sm text-muted-foreground shrink-0">
                            {assignment.submissions}/{assignment.total}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Recent Submissions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <TrendingUp className="h-5 w-5" />
                  Recent Submissions
                </CardTitle>
                <CardDescription>Latest student submissions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {data.recentSubmissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No recent submissions
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2 pr-4">
                  {data.recentSubmissions.map((submission) => (
                    <div
                      key={submission.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-indigo-50/40 transition-colors"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {submission.student.split(" ").map(n => n[0]).join("").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{submission.student}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {submission.assignment}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant={submission.status === "late" ? "destructive" : "secondary"}>
                          {submission.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {submission.submittedAt}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* My Classes Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <BookOpen className="h-5 w-5" />
                My Classes
              </CardTitle>
              <CardDescription>Classes you&apos;re teaching this term</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.assignedClasses.map((cls) => (
              <Link
                key={cls.id}
                href={`/academic/classes/${cls.id}`}
                className="p-4 rounded-lg border border-slate-200 hover:shadow-md transition-all hover:border-emerald-300 group"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium group-hover:text-emerald-600 transition-colors">
                    {cls.subject}
                  </p>
                  <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {cls.studentCount}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {cls.name} - {cls.section}
                </p>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}