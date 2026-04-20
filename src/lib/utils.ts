import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { UserRole } from "@prisma/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "TZS"): string {
  return new Intl.NumberFormat("en-TZ", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function generateStudentId(seq: number, year?: number): string {
  const y = year ?? new Date().getFullYear();
  return `SMS-${y}-${String(seq).padStart(5, "0")}`;
}

export function generateEmployeeId(seq: number, year?: number): string {
  const y = year ?? new Date().getFullYear();
  return `EMP-${y}-${String(seq).padStart(4, "0")}`;
}

export function getRoleDashboardPath(role: UserRole): string {
  const paths: Record<UserRole, string> = {
    SUPER_ADMIN: "/dashboard/admin",
    SCHOOL_ADMIN: "/dashboard/admin",
    TEACHER: "/dashboard/teacher",
    STUDENT: "/dashboard/student",
    PARENT: "/dashboard/parent",
    ACCOUNTANT: "/dashboard/finance",
    LIBRARIAN: "/dashboard/library",
    RECEPTIONIST: "/dashboard/reception",
    IT_ADMIN: "/dashboard/admin",
  };
  return paths[role] ?? "/dashboard";
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    SUPER_ADMIN: "Super Admin",
    SCHOOL_ADMIN: "School Admin",
    TEACHER: "Teacher",
    STUDENT: "Student",
    PARENT: "Parent",
    ACCOUNTANT: "Accountant",
    LIBRARIAN: "Librarian",
    RECEPTIONIST: "Receptionist",
    IT_ADMIN: "IT Admin",
  };
  return labels[role] ?? role;
}

export function canAccess(
  userRole: UserRole,
  allowedRoles: UserRole[]
): boolean {
  return allowedRoles.includes(userRole);
}

export const ADMIN_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "IT_ADMIN",
];
export const STAFF_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "TEACHER",
  "ACCOUNTANT",
  "LIBRARIAN",
  "RECEPTIONIST",
  "IT_ADMIN",
];

export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + "..." : str;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Role-based color utilities
export function getRoleGradient(role: UserRole): string {
  const gradients: Record<UserRole, string> = {
    SUPER_ADMIN: "from-indigo-600 to-violet-600",
    IT_ADMIN: "from-indigo-600 to-violet-600",
    SCHOOL_ADMIN: "from-teal-600 to-cyan-600",
    TEACHER: "from-emerald-600 to-teal-600",
    STUDENT: "from-sky-500 to-indigo-500",
    PARENT: "from-rose-600 to-orange-500",
    ACCOUNTANT: "from-amber-600 to-yellow-500",
    LIBRARIAN: "from-purple-600 to-indigo-500",
    RECEPTIONIST: "from-pink-500 to-rose-500",
  };
  return gradients[role] ?? "from-indigo-600 to-violet-600";
}

export function getRoleColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    SUPER_ADMIN: "text-indigo-600",
    IT_ADMIN: "text-indigo-600",
    SCHOOL_ADMIN: "text-teal-600",
    TEACHER: "text-emerald-600",
    STUDENT: "text-sky-500",
    PARENT: "text-rose-600",
    ACCOUNTANT: "text-amber-600",
    LIBRARIAN: "text-purple-600",
    RECEPTIONIST: "text-pink-500",
  };
  return colors[role] ?? "text-indigo-600";
}

export function getRoleBg(role: UserRole): string {
  const bgs: Record<UserRole, string> = {
    SUPER_ADMIN: "bg-indigo-50",
    IT_ADMIN: "bg-indigo-50",
    SCHOOL_ADMIN: "bg-teal-50",
    TEACHER: "bg-emerald-50",
    STUDENT: "bg-sky-50",
    PARENT: "bg-rose-50",
    ACCOUNTANT: "bg-amber-50",
    LIBRARIAN: "bg-purple-50",
    RECEPTIONIST: "bg-pink-50",
  };
  return bgs[role] ?? "bg-indigo-50";
}

export function getRoleBorder(role: UserRole): string {
  const borders: Record<UserRole, string> = {
    SUPER_ADMIN: "border-indigo-500",
    IT_ADMIN: "border-indigo-500",
    SCHOOL_ADMIN: "border-teal-500",
    TEACHER: "border-emerald-500",
    STUDENT: "border-sky-500",
    PARENT: "border-rose-500",
    ACCOUNTANT: "border-amber-500",
    LIBRARIAN: "border-purple-500",
    RECEPTIONIST: "border-pink-500",
  };
  return borders[role] ?? "border-indigo-500";
}

export const CHART_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6"];
