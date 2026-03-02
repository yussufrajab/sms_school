"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar,
  FileText,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  DollarSign,
  ArrowRight,
  Bell,
  MessageSquare,
  Award,
  Target,
} from "lucide-react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  AreaChart,
  Area,
} from "recharts";

interface StudentDashboardProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: string;
  };
  data: {
    classInfo: {
      name: string;
      section: string;
    };
    todaySchedule: Array<{
      id: string;
      period: number;
      subject: string;
      time: string;
      teacher: string;
    }>;
    upcomingAssignments: Array<{
      id: string;
      title: string;
      subject: string;
      dueDate: string;
      daysLeft: number;
      status: string;
    }>;
    attendanceSummary: {
      present: number;
      absent: number;
      late: number;
      total: number;
      percentage: number;
    };
    recentGrades: Array<{
      id: string;
      subject: string;
      assignment: string;
      marks: number;
      maxMarks: number;
      grade: string;
    }>;
    feeStatus: {
      totalDue: number;
      paid: number;
      pending: number;
    };
    upcomingEvents: Array<{
      id: string;
      title: string;
      date: string;
      type: string;
    }>;
    gradeTrend?: Array<{
      month: string;
      average: number;
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

const quickActions = [
  { label: "My Assignments", href: "/academic/assignments", icon: FileText, color: "text-blue-500" },
  { label: "Timetable", href: "/academic/timetable", icon: Calendar, color: "text-green-500" },
  { label: "Results", href: "/examinations", icon: Award, color: "text-purple-500" },
  { label: "Messages", href: "/communication/messages", icon: MessageSquare, color: "text-orange-500" },
  { label: "Fee Payment", href: "/fees", icon: DollarSign, color: "text-cyan-500" },
  { label: "Announcements", href: "/communication/announcements", icon: Bell, color: "text-pink-500" },
];

export function StudentDashboard({ user, data }: StudentDashboardProps) {
  const averageGrade = data.recentGrades.length > 0
    ? data.recentGrades.reduce((sum, g) => sum + (g.marks / g.maxMarks) * 100, 0) / data.recentGrades.length
    : 0;

  const pendingAssignmentsCount = data.upcomingAssignments.filter(a => a.status === "pending").length;

  // Attendance radial chart data
  const attendanceData = [
    {
      name: "Attendance",
      value: data.attendanceSummary.percentage,
      fill: data.attendanceSummary.percentage >= 80 ? "#22c55e" : data.attendanceSummary.percentage >= 60 ? "#f59e0b" : "#ef4444",
    },
  ];

  // Calculate grade color
  const getGradeColor = (percentage: number): string => {
    if (percentage >= 80) return "text-green-500";
    if (percentage >= 60) return "text-yellow-500";
    if (percentage >= 40) return "text-orange-500";
    return "text-red-500";
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {user.name?.split(" ")[0] || "Student"}!</h1>
          <p className="text-muted-foreground">
            {data.classInfo.name} - {data.classInfo.section}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/academic/assignments">
              <FileText className="mr-2 h-4 w-4" />
              My Assignments
            </Link>
          </Button>
          <Button asChild>
            <Link href="/academic/timetable">
              <Calendar className="mr-2 h-4 w-4" />
              View Timetable
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Links</CardTitle>
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

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold">{data.attendanceSummary.percentage}%</div>
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
            <p className="text-xs text-muted-foreground mt-1">
              {data.attendanceSummary.present} present, {data.attendanceSummary.absent} absent
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Assignments</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingAssignmentsCount}</div>
            <Progress 
              value={data.upcomingAssignments.length > 0 
                ? ((data.upcomingAssignments.length - pendingAssignmentsCount) / data.upcomingAssignments.length) * 100 
                : 100
              } 
              className="mt-2 h-2" 
            />
            <p className="text-xs text-muted-foreground mt-1">
              {data.upcomingAssignments.length - pendingAssignmentsCount} completed
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getGradeColor(averageGrade)}`}>
              {data.recentGrades.length > 0 ? `${averageGrade.toFixed(1)}%` : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">Based on recent submissions</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fee Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.feeStatus.pending > 0 ? "text-red-500" : "text-green-500"}`}>
              ${data.feeStatus.pending.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.feeStatus.pending > 0 ? "Outstanding balance" : "All fees cleared"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Tasks */}
      {data.pendingTasks && data.pendingTasks.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                <Target className="h-5 w-5" />
                Tasks Due Soon
              </CardTitle>
              <Badge variant="secondary">{data.pendingTasks.length} pending</Badge>
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

      {/* Grade Trend Chart */}
      {data.gradeTrend && data.gradeTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Grade Trend
            </CardTitle>
            <CardDescription>Your academic performance over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.gradeTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis domain={[0, 100]} className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value) => [`${Number(value).toFixed(1)}%`, "Average"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="average"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Today&apos;s Schedule
                </CardTitle>
                <CardDescription>Your classes for today</CardDescription>
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
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-muted" />
                <div className="space-y-3">
                  {data.todaySchedule.map((schedule) => (
                    <div key={schedule.id} className="relative flex items-start gap-4">
                      <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                        {schedule.period}
                      </div>
                      <div className="flex-1 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{schedule.subject}</p>
                            <p className="text-sm text-muted-foreground">{schedule.teacher}</p>
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

        {/* Upcoming Assignments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Upcoming Assignments
                </CardTitle>
                <CardDescription>Assignments due soon</CardDescription>
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
            {data.upcomingAssignments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-2" />
                <p>All caught up! No pending assignments.</p>
              </div>
            ) : (
              <ScrollArea className="h-[280px]">
                <div className="space-y-2 pr-4">
                  {data.upcomingAssignments.slice(0, 6).map((assignment) => (
                    <Link
                      key={assignment.id}
                      href={`/academic/assignments/${assignment.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{assignment.title}</p>
                        <p className="text-sm text-muted-foreground">{assignment.subject}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant={assignment.daysLeft <= 1 ? "destructive" : assignment.daysLeft <= 3 ? "secondary" : "outline"}>
                          {assignment.daysLeft === 0 ? "Due today" : assignment.daysLeft === 1 ? "Tomorrow" : `${assignment.daysLeft} days`}
                        </Badge>
                        {assignment.status === "submitted" && (
                          <p className="text-xs text-green-500 mt-1">Submitted</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Grades */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Recent Grades
                </CardTitle>
                <CardDescription>Your latest assessment results</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/examinations">
                  All Results
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.recentGrades.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No grades available yet
              </div>
            ) : (
              <ScrollArea className="h-[280px]">
                <div className="space-y-2 pr-4">
                  {data.recentGrades.slice(0, 6).map((grade) => {
                    const percentage = Math.round((grade.marks / grade.maxMarks) * 100);
                    return (
                      <div
                        key={grade.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{grade.assignment}</p>
                          <p className="text-sm text-muted-foreground">{grade.subject}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="font-medium">{grade.marks}/{grade.maxMarks}</p>
                            <p className="text-sm text-muted-foreground">{grade.grade}</p>
                          </div>
                          <div className="w-12 h-12">
                            <ResponsiveContainer width="100%" height="100%">
                              <RadialBarChart
                                innerRadius="70%"
                                outerRadius="100%"
                                data={[{ value: percentage, fill: percentage >= 50 ? "#22c55e" : "#ef4444" }]}
                                startAngle={90}
                                endAngle={-270}
                              >
                                <RadialBar dataKey="value" cornerRadius={10} />
                              </RadialBarChart>
                            </ResponsiveContainer>
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

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming Events
                </CardTitle>
                <CardDescription>School events and activities</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/communication/events">
                  View All
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.upcomingEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No upcoming events
              </div>
            ) : (
              <ScrollArea className="h-[280px]">
                <div className="space-y-2 pr-4">
                  {data.upcomingEvents.slice(0, 6).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary shrink-0">
                        <span className="text-xs font-medium">
                          {new Date(event.date).toLocaleDateString("en-US", { month: "short" })}
                        </span>
                        <span className="text-lg font-bold">
                          {new Date(event.date).getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{event.title}</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {event.type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}