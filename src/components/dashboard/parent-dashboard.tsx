"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  DollarSign,
  AlertCircle,
  Calendar,
  MessageSquare,
  TrendingUp,
  Clock,
  ArrowRight,
  Bell,
  FileText,
  CreditCard,
  BookOpen,
  CheckCircle2,
  Target,
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";

interface ParentDashboardProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: string;
  };
  data: {
    children: Array<{
      id: string;
      name: string;
      class: string;
      section: string;
      photoUrl?: string;
      attendancePercentage: number;
      averageGrade: string;
      pendingAssignments: number;
    }>;
    feeSummary: {
      totalDue: number;
      paid: number;
      overdue: number;
    };
    recentMessages: Array<{
      id: string;
      from: string;
      subject: string;
      date: string;
      unread: boolean;
    }>;
    upcomingEvents: Array<{
      id: string;
      title: string;
      date: string;
      type: string;
    }>;
    attendanceAlerts: Array<{
      id: string;
      childName: string;
      date: string;
      status: string;
    }>;
    childrenPerformance?: Array<{
      name: string;
      attendance: number;
      assignments: number;
      exams: number;
      behavior: number;
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
  { label: "Messages", href: "/communication/messages", icon: MessageSquare, color: "text-blue-500" },
  { label: "Pay Fees", href: "/finance/invoices", icon: CreditCard, color: "text-green-500" },
  { label: "Events", href: "/communication/events", icon: Calendar, color: "text-purple-500" },
  { label: "Announcements", href: "/communication/announcements", icon: Bell, color: "text-orange-500" },
  { label: "Results", href: "/examinations", icon: TrendingUp, color: "text-cyan-500" },
  { label: "Assignments", href: "/academic/assignments", icon: FileText, color: "text-pink-500" },
];

export function ParentDashboard({ user, data }: ParentDashboardProps) {
  const totalPendingAssignments = data.children.reduce((sum, c) => sum + c.pendingAssignments, 0);
  const unreadMessages = data.recentMessages.filter(m => m.unread).length;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {user.name?.split(" ")[0] || "Parent"}!</h1>
          <p className="text-muted-foreground">Monitor your children&apos;s academic progress</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/communication/messages">
              <MessageSquare className="mr-2 h-4 w-4" />
              Messages
              {unreadMessages > 0 && (
                <Badge variant="destructive" className="ml-2">{unreadMessages}</Badge>
              )}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/finance/invoices">
              <DollarSign className="mr-2 h-4 w-4" />
              Pay Fees
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

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Children</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.children.length}</div>
            <p className="text-xs text-muted-foreground">Enrolled students</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fee Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.feeSummary.overdue > 0 ? "text-red-500" : ""}`}>
              ${(data.feeSummary.totalDue - data.feeSummary.paid).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.feeSummary.overdue > 0 ? (
                <span className="text-destructive">${data.feeSummary.overdue} overdue</span>
              ) : (
                "All payments up to date"
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreadMessages}</div>
            <p className="text-xs text-muted-foreground">From teachers & admin</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.attendanceAlerts.length}</div>
            <p className="text-xs text-muted-foreground">This month</p>
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

      {/* Children Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                My Children
              </CardTitle>
              <CardDescription>Overview of your children&apos;s academic progress</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {data.children.map((child) => (
              <Link
                key={child.id}
                href={`/students/${child.id}`}
                className="block"
              >
                <Card className="border hover:shadow-md transition-all hover:border-primary/50">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={child.photoUrl} alt={child.name} />
                        <AvatarFallback>
                          {child.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{child.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {child.class} - {child.section}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Attendance</p>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{child.attendancePercentage}%</span>
                          <Progress 
                            value={child.attendancePercentage} 
                            className="flex-1 h-2" 
                          />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Grade</p>
                        <Badge variant="secondary">{child.averageGrade}</Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Assignments</p>
                        <Badge variant={child.pendingAssignments > 0 ? "destructive" : "secondary"}>
                          {child.pendingAssignments} pending
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Children Performance Comparison */}
      {data.childrenPerformance && data.childrenPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Comparison
            </CardTitle>
            <CardDescription>Compare your children&apos;s academic performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={data.childrenPerformance}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" className="text-xs" />
                  <PolarRadiusAxis domain={[0, 100]} />
                  {data.children.map((child, index) => (
                    <Radar
                      key={child.id}
                      name={child.name}
                      dataKey={data.childrenPerformance?.[index] ? Object.keys(data.childrenPerformance[index]).find(k => k !== 'name') : 'attendance'}
                      stroke={index === 0 ? "#22c55e" : index === 1 ? "#3b82f6" : "#f59e0b"}
                      fill={index === 0 ? "#22c55e" : index === 1 ? "#3b82f6" : "#f59e0b"}
                      fillOpacity={0.3}
                    />
                  ))}
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Messages */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Recent Messages
                </CardTitle>
                <CardDescription>Messages from teachers and school</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/communication/messages">
                  View All
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.recentMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-2" />
                <p>No messages yet</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2 pr-4">
                  {data.recentMessages.slice(0, 6).map((message) => (
                    <Link
                      key={message.id}
                      href={`/communication/messages/${message.id}`}
                      className={`flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors ${message.unread ? "bg-primary/5 border-primary/20" : ""}`}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {message.from.split(" ").map(n => n[0]).join("").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{message.from}</p>
                          {message.unread && (
                            <span className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{message.subject}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{message.date}</span>
                    </Link>
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
              <ScrollArea className="h-[300px]">
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

      {/* Attendance Alerts */}
      {data.attendanceAlerts.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertCircle className="h-5 w-5" />
              Attendance Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2">
              {data.attendanceAlerts.slice(0, 4).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900"
                >
                  <div>
                    <p className="font-medium">{alert.childName}</p>
                    <p className="text-sm text-muted-foreground">{alert.date}</p>
                  </div>
                  <Badge variant={alert.status === "ABSENT" ? "destructive" : "secondary"}>
                    {alert.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}