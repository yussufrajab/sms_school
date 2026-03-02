import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { UserRole } from "@prisma/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
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
