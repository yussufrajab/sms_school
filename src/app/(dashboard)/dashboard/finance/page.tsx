import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AccountantDashboard } from "@/components/dashboard/accountant-dashboard";

export default async function AccountantDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const schoolId = session.user.schoolId;
  if (!schoolId) redirect("/login");

  // Get fee collection summary
  const invoices = await prisma.invoice.findMany({
    where: { Student: { schoolId } },
    select: { totalAmount: true, paidAmount: true, status: true },
  });

  const feeCollection = {
    collected: invoices.reduce((sum, i) => sum + i.paidAmount, 0),
    pending: invoices.filter(i => i.status !== "PAID").reduce((sum, i) => sum + (i.totalAmount - i.paidAmount), 0),
    overdue: invoices.filter(i => i.status === "OVERDUE").reduce((sum, i) => sum + (i.totalAmount - i.paidAmount), 0),
    total: invoices.reduce((sum, i) => sum + i.totalAmount, 0),
  };

  // Get recent payments
  const recentPayments = await prisma.payment.findMany({
    where: { Invoice: { Student: { schoolId } } },
    include: {
      Invoice: {
        include: { Student: true },
      },
    },
    orderBy: { paidAt: "desc" },
    take: 10,
  });

  // Get defaulters
  const defaulters = await prisma.invoice.findMany({
    where: {
      Student: { schoolId },
      status: "OVERDUE",
    },
    include: {
      Student: {
        include: { Section: { include: { Class: true } } },
      },
    },
    take: 10,
  });

  // Get payroll info
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const payroll = await prisma.payroll.findFirst({
    where: {
      AcademicYear: { schoolId },
      month: currentMonth,
      year: currentYear,
    },
    include: {
      PayrollItem: { select: { netSalary: true } },
    },
  });

  const totalStaff = await prisma.staff.count({
    where: { schoolId, isActive: true },
  });

  const payrollData = {
    totalAmount: payroll?.PayrollItem.reduce((sum, i) => sum + i.netSalary, 0) || 0,
    paidStaff: payroll?.PayrollItem.length || 0,
    totalStaff,
    nextPayDate: `${currentMonth + 1}/25/${currentYear}`,
  };

  // Monthly collection data (mock - would calculate from actual data)
  const monthlyCollection = [
    { month: "Aug", collected: 45000, pending: 5000 },
    { month: "Sep", collected: 52000, pending: 3000 },
    { month: "Oct", collected: 48000, pending: 7000 },
    { month: "Nov", collected: 55000, pending: 2000 },
    { month: "Dec", collected: 50000, pending: 5000 },
    { month: "Jan", collected: 53000, pending: 4000 },
  ];

  const dashboardData = {
    feeCollection,
    monthlyCollection,
    payroll: payrollData,
    recentPayments: recentPayments.map(p => ({
      id: p.id,
      studentName: p.Invoice.Student.firstName + " " + p.Invoice.Student.lastName,
      amount: p.amount,
      method: p.method,
      date: p.paidAt.toLocaleDateString(),
    })),
    defaulters: defaulters.map(d => {
      const daysOverdue = Math.floor((new Date().getTime() - d.dueDate.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: d.id,
        studentName: d.Student.firstName + " " + d.Student.lastName,
        class: d.Student.Section?.Class.name || "N/A",
        amount: d.totalAmount - d.paidAmount,
        daysOverdue,
      };
    }),
  };

  return <AccountantDashboard user={session.user} data={dashboardData} />;
}
