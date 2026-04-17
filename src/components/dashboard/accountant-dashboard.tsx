"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DollarSign,
  TrendingUp,
  Users,
  FileText,
  AlertCircle,
  CreditCard,
  ArrowRight,
  Clock,
  Target,
  Receipt,
  Wallet,
  PieChart,
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
  PieChart as RechartsPie,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

interface AccountantDashboardProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: string;
  };
  data: {
    feeCollection: {
      collected: number;
      pending: number;
      overdue: number;
      total: number;
    };
    monthlyCollection: Array<{
      month: string;
      collected: number;
      pending: number;
    }>;
    payroll: {
      totalAmount: number;
      paidStaff: number;
      totalStaff: number;
      nextPayDate: string;
    };
    recentPayments: Array<{
      id: string;
      studentName: string;
      amount: number;
      method: string;
      date: string;
    }>;
    defaulters: Array<{
      id: string;
      studentName: string;
      class: string;
      amount: number;
      daysOverdue: number;
    }>;
    pendingTasks?: Array<{
      id: string;
      title: string;
      description: string;
      priority: "high" | "medium" | "low";
      dueDate?: string;
      link?: string;
    }>;
    collectionTrend?: Array<{
      date: string;
      amount: number;
    }>;
  };
}

const COLORS = ["#22c55e", "#f59e0b", "#ef4444"];

const quickActions = [
  { label: "Invoices", href: "/finance/invoices", icon: Receipt, iconBg: "bg-indigo-50", iconColor: "text-indigo-600" },
  { label: "Fee Structure", href: "/finance/fees", icon: DollarSign, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
  { label: "Payroll", href: "/finance/payroll", icon: Wallet, iconBg: "bg-purple-50", iconColor: "text-purple-600" },
  { label: "Reports", href: "/finance/reports", icon: PieChart, iconBg: "bg-orange-50", iconColor: "text-orange-600" },
  { label: "Expenses", href: "/finance/expenses", icon: FileText, iconBg: "bg-cyan-50", iconColor: "text-cyan-600" },
  { label: "Defaulters", href: "/finance/invoices?status=overdue", icon: AlertCircle, iconBg: "bg-red-50", iconColor: "text-red-600" },
];

export function AccountantDashboard({ user, data }: AccountantDashboardProps) {
  const collectionPercentage = data.feeCollection.total > 0
    ? Math.round((data.feeCollection.collected / data.feeCollection.total) * 100)
    : 0;

  const pieData = [
    { name: "Collected", value: data.feeCollection.collected },
    { name: "Pending", value: data.feeCollection.pending },
    { name: "Overdue", value: data.feeCollection.overdue },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-600 to-yellow-500 p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Finance Dashboard</h1>
            <p className="text-amber-100">Overview of financial operations</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white" asChild>
              <Link href="/finance/invoices"><FileText className="mr-2 h-4 w-4" />Invoices</Link>
            </Button>
            <Button className="bg-white text-amber-600 hover:bg-amber-50 shadow-sm" asChild>
              <Link href="/finance/fees"><DollarSign className="mr-2 h-4 w-4" />Fee Structure</Link>
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
        <Card className="border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Collected</CardTitle>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-50"><TrendingUp className="h-4 w-4 text-emerald-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${data.feeCollection.collected.toLocaleString()}
            </div>
            <Progress value={collectionPercentage} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {collectionPercentage}% of total fees
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Pending Amount</CardTitle>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-50"><CreditCard className="h-4 w-4 text-amber-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              ${data.feeCollection.pending.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Overdue Amount</CardTitle>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-50"><AlertCircle className="h-4 w-4 text-red-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${data.feeCollection.overdue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">{data.defaulters.length} defaulters</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Payroll (Monthly)</CardTitle>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-50"><Users className="h-4 w-4 text-indigo-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              ${data.payroll.totalAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.payroll.paidStaff}/{data.payroll.totalStaff} staff • Next: {data.payroll.nextPayDate}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Collection Trend Line Chart */}
      {data.collectionTrend && data.collectionTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <TrendingUp className="h-5 w-5" />
              Collection Trend
            </CardTitle>
            <CardDescription>Daily fee collection over the past 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.collectionTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs" 
                    tickFormatter={(value) => value.split("-").slice(1).join("/")}
                  />
                  <YAxis className="text-xs" tickFormatter={(value) => `$${value / 1000}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                    }}
                    formatter={(value) => [`$${Number(value).toLocaleString()}`, "Collected"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                    name="Collected"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Collection Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-800">Monthly Collection</CardTitle>
            <CardDescription>Fee collection trend over the past 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyCollection}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                    }}
                    formatter={(value) => [`$${Number(value).toLocaleString()}`, ""]}
                  />
                  <Bar dataKey="collected" fill="#22c55e" name="Collected" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" fill="#f59e0b" name="Pending" radius={[4, 4, 0, 0]} />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Collection Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-800">Fee Collection Status</CardTitle>
            <CardDescription>Distribution of fee collection status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`$${Number(value).toLocaleString()}`, ""]}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {pieData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index] }}
                  />
                  <span className="text-sm">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-slate-800">Recent Payments</CardTitle>
                <CardDescription>Latest fee payments received</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/finance/invoices">
                  View All
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.recentPayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-2" />
                <p>No recent payments</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3 pr-4">
                  {data.recentPayments.slice(0, 8).map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-amber-50/40 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{payment.studentName}</p>
                        <p className="text-sm text-muted-foreground">{payment.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-600">${payment.amount.toLocaleString()}</p>
                        <Badge variant="outline">{payment.method}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Defaulters List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Fee Defaulters
                </CardTitle>
                <CardDescription>Students with overdue payments</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/finance/invoices?status=overdue">
                  View All
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.defaulters.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-2" />
                <p>No defaulters</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3 pr-4">
                  {data.defaulters.slice(0, 8).map((defaulter) => (
                    <div
                      key={defaulter.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{defaulter.studentName}</p>
                        <p className="text-sm text-muted-foreground">{defaulter.class}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-red-600">${defaulter.amount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{defaulter.daysOverdue} days overdue</p>
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