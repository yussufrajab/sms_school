"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  Calendar,
  Clock,
  Phone,
  UserCheck,
  Bell,
  ArrowRight,
  Target,
  TrendingUp,
  UserPlus,
  MessageSquare,
  FileText,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { cn, getRoleGradient } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ReceptionistDashboardProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: string;
  };
  data: {
    todayVisitors: Array<{
      id: string;
      name: string;
      purpose: string;
      checkIn: string;
      checkOut?: string;
      status: string;
    }>;
    appointments: Array<{
      id: string;
      visitorName: string;
      personToMeet: string;
      time: string;
      purpose: string;
      status: string;
    }>;
    recentEnquiries: Array<{
      id: string;
      parentName: string;
      phone: string;
      childName: string;
      class: string;
      status: string;
      createdAt: string;
    }>;
    announcements: Array<{
      id: string;
      title: string;
      date: string;
    }>;
    stats: {
      totalVisitorsToday: number;
      pendingAppointments: number;
      newEnquiries: number;
    };
    pendingTasks?: Array<{
      id: string;
      title: string;
      description: string;
      priority: "high" | "medium" | "low";
      dueDate?: string;
      link?: string;
    }>;
    visitorTrend?: Array<{
      date: string;
      visitors: number;
    }>;
  };
}

const quickActions = [
  { label: "Check In", href: "/reception/check-in", icon: UserCheck, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
  { label: "Appointments", href: "/reception/appointments", icon: Calendar, iconBg: "bg-indigo-50", iconColor: "text-indigo-600" },
  { label: "Enquiries", href: "/students?tab=enquiries", icon: Phone, iconBg: "bg-purple-50", iconColor: "text-purple-600" },
  { label: "Announcements", href: "/communication/announcements", icon: Bell, iconBg: "bg-orange-50", iconColor: "text-orange-600" },
  { label: "Messages", href: "/communication/messages", icon: MessageSquare, iconBg: "bg-cyan-50", iconColor: "text-cyan-600" },
  { label: "Reports", href: "/reception/reports", icon: FileText, iconBg: "bg-pink-50", iconColor: "text-pink-600" },
];

export function ReceptionistDashboard({ user, data }: ReceptionistDashboardProps) {
  const activeVisitors = data.todayVisitors.filter(v => v.status === "checked_in").length;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Reception Dashboard</h1>
            <p className="text-pink-100">Manage visitors and front desk operations</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white" asChild>
              <Link href="/communication/announcements"><Bell className="mr-2 h-4 w-4" />Announcements</Link>
            </Button>
            <Button className="bg-white text-pink-600 hover:bg-pink-50 shadow-sm" asChild>
              <Link href="/reception/check-in"><UserPlus className="mr-2 h-4 w-4" />New Enquiry</Link>
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
        <Card className="border-l-4 border-l-pink-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Visitors Today</CardTitle>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-pink-50"><Users className="h-4 w-4 text-pink-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{data.stats.totalVisitorsToday}</div>
            <p className="text-xs text-slate-500">Checked in today</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Appointments</CardTitle>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-50"><Calendar className="h-4 w-4 text-indigo-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{data.stats.pendingAppointments}</div>
            <p className="text-xs text-slate-500">Pending today</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">New Enquiries</CardTitle>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-purple-50"><Phone className="h-4 w-4 text-purple-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{data.stats.newEnquiries}</div>
            <p className="text-xs text-slate-500">This week</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Active Now</CardTitle>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-50"><Clock className="h-4 w-4 text-emerald-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{activeVisitors}</div>
            <p className="text-xs text-slate-500">Visitors in building</p>
          </CardContent>
        </Card>
      </div>

      {/* Visitor Trend */}
      {data.visitorTrend && data.visitorTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <TrendingUp className="h-5 w-5" />
              Visitor Trend
            </CardTitle>
            <CardDescription>Daily visitor count over the past 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.visitorTrend}>
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
                    formatter={(value) => [value, "Visitors"]}
                  />
                  <Bar dataKey="visitors" fill="#6366f1" name="Visitors" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Visitors */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <Users className="h-5 w-5" />
                  Today&apos;s Visitors
                </CardTitle>
                <CardDescription>Visitor log for today</CardDescription>
              </div>
              <Button size="sm">
                <UserCheck className="mr-2 h-4 w-4" />
                Check In
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.todayVisitors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-2" />
                <p>No visitors today</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3 pr-4">
                  {data.todayVisitors.slice(0, 8).map((visitor) => (
                    <div
                      key={visitor.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-pink-50/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {visitor.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{visitor.name}</p>
                          <p className="text-sm text-muted-foreground">{visitor.purpose}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={visitor.status === "checked_in" ? "default" : "secondary"}>
                          {visitor.status === "checked_in" ? "In Building" : "Checked Out"}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">{visitor.checkIn}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Appointments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <Calendar className="h-5 w-5" />
                  Today&apos;s Appointments
                </CardTitle>
                <CardDescription>Scheduled meetings</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/reception/appointments">
                  View All
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.appointments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-2" />
                <p>No appointments today</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3 pr-4">
                  {data.appointments.slice(0, 8).map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-pink-50/40 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{appointment.visitorName}</p>
                        <p className="text-sm text-muted-foreground">
                          Meeting: {appointment.personToMeet}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={appointment.status === "pending" ? "secondary" : "default"}>
                          {appointment.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">{appointment.time}</p>
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
        {/* Recent Enquiries */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <Phone className="h-5 w-5" />
                  Recent Enquiries
                </CardTitle>
                <CardDescription>Admission enquiries</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/students?tab=enquiries">
                  View All
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.recentEnquiries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-2" />
                <p>No recent enquiries</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3 pr-4">
                  {data.recentEnquiries.slice(0, 8).map((enquiry) => (
                    <div
                      key={enquiry.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-pink-50/40 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{enquiry.parentName}</p>
                        <p className="text-sm text-muted-foreground">
                          Child: {enquiry.childName} ({enquiry.class})
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={enquiry.status === "new" ? "destructive" : "secondary"}>
                          {enquiry.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">{enquiry.createdAt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Announcements */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <Bell className="h-5 w-5" />
                  Recent Announcements
                </CardTitle>
                <CardDescription>School announcements</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/communication/announcements">
                  View All
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.announcements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-2" />
                <p>No announcements</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3 pr-4">
                  {data.announcements.slice(0, 8).map((announcement) => (
                    <div
                      key={announcement.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-pink-50/40 transition-colors"
                    >
                      <p className="font-medium">{announcement.title}</p>
                      <span className="text-sm text-muted-foreground">{announcement.date}</span>
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