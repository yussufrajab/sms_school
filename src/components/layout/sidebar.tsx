"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRole } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  BookOpen,
  ClipboardList,
  DollarSign,
  Library,
  Bus,
  Bell,
  Calendar,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  MessageSquare,
  FileText,
  Briefcase,
  Building2,
  Clock,
  CalendarDays,
  Receipt,
  Users2,
  User,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  roles: UserRole[];
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "STUDENT", "PARENT", "ACCOUNTANT", "LIBRARIAN", "RECEPTIONIST", "IT_ADMIN"],
  },
  {
    label: "Students",
    href: "/students",
    icon: Users,
    roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "RECEPTIONIST"],
  },
  {
    label: "Staff",
    href: "/staff",
    icon: Briefcase,
    roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "IT_ADMIN"],
  },
  {
    label: "Academic",
    href: "/academic",
    icon: GraduationCap,
    roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"],
    children: [
      { label: "Classes & Sections", href: "/academic/classes", icon: Building2, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"] },
      { label: "Subjects", href: "/academic/subjects", icon: BookOpen, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"] },
      { label: "Timetable", href: "/academic/timetable", icon: Clock, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"] },
      { label: "Assignments", href: "/academic/assignments", icon: FileText, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"] },
      { label: "Examinations", href: "/academic/exams", icon: ClipboardList, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"] },
    ],
  },
  {
    label: "Attendance",
    href: "/attendance",
    icon: UserCheck,
    roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"],
  },
  {
    label: "HR",
    href: "/hr",
    icon: Users2,
    roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT", "TEACHER"],
    children: [
      { label: "Leave Management", href: "/hr/leave", icon: CalendarDays, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "ACCOUNTANT"] },
      { label: "Salary Structure", href: "/hr/salary", icon: DollarSign, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"] },
      { label: "Payroll", href: "/hr/payroll", icon: Receipt, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"] },
    ],
  },
  {
    label: "Finance",
    href: "/finance",
    icon: DollarSign,
    roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"],
    children: [
      { label: "Fee Structure", href: "/finance/fees", icon: DollarSign, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"] },
      { label: "Invoices", href: "/finance/invoices", icon: FileText, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"] },
    ],
  },
  {
    label: "Library",
    href: "/library",
    icon: Library,
    roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "LIBRARIAN", "STUDENT", "TEACHER"],
    children: [
      { label: "Books Catalog", href: "/library/books", icon: BookOpen, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "LIBRARIAN", "STUDENT", "TEACHER"] },
      { label: "Borrow & Return", href: "/library/borrow", icon: UserCheck, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "LIBRARIAN"] },
    ],
  },
  {
    label: "Transport",
    href: "/transport",
    icon: Bus,
    roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "STUDENT", "PARENT"],
  },
  {
    label: "Communication",
    href: "/communication",
    icon: MessageSquare,
    roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "STUDENT", "PARENT", "ACCOUNTANT", "LIBRARIAN", "RECEPTIONIST"],
    children: [
      { label: "Announcements", href: "/communication/announcements", icon: Bell, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "STUDENT", "PARENT"] },
      { label: "Messages", href: "/communication/messages", icon: MessageSquare, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "STUDENT", "PARENT"] },
      { label: "Events", href: "/communication/events", icon: Calendar, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "STUDENT", "PARENT"] },
    ],
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT", "IT_ADMIN"],
  },
  {
    label: "Profile",
    href: "/profile",
    icon: User,
    roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "STUDENT", "PARENT", "ACCOUNTANT", "LIBRARIAN", "RECEPTIONIST", "IT_ADMIN"],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["SUPER_ADMIN", "IT_ADMIN"],
  },
];

interface SidebarProps {
  userRole: UserRole;
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const filteredItems = navItems.filter((item) =>
    item.roles.includes(userRole)
  );

  const toggleExpanded = (href: string) => {
    setExpandedItems((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]
    );
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "relative flex flex-col h-full bg-card border-r border-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground flex-shrink-0">
          <GraduationCap className="w-5 h-5" />
        </div>
        {!collapsed && (
          <span className="ml-3 font-semibold text-sm truncate">
            School MS
          </span>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-2">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedItems.includes(item.href);
            const active = isActive(item.href);

            return (
              <div key={item.href}>
                {hasChildren ? (
                  <button
                    onClick={() => toggleExpanded(item.href)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {item.badge}
                          </Badge>
                        )}
                        <ChevronRight
                          className={cn(
                            "w-4 h-4 transition-transform",
                            isExpanded && "rotate-90"
                          )}
                        />
                      </>
                    )}
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </>
                    )}
                  </Link>
                )}

                {/* Children */}
                {hasChildren && isExpanded && !collapsed && (
                  <div className="ml-4 mt-1 space-y-1 border-l border-border pl-3">
                    {item.children!
                      .filter((child) => child.roles.includes(userRole))
                      .map((child) => {
                        const ChildIcon = child.icon;
                        const childActive = pathname.startsWith(child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                              childActive
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                          >
                            <ChildIcon className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{child.label}</span>
                          </Link>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}
