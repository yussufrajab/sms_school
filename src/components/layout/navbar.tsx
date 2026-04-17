"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { UserRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  Search,
  LogOut,
  User,
  Settings,
  ChevronDown,
} from "lucide-react";
import { getInitials, getRoleLabel, getRoleGradient } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface NavbarProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: UserRole;
  };
  notificationCount?: number;
}

export function Navbar({ user, notificationCount = 0 }: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const liveNotificationCount = useNotificationStream(notificationCount);
  const roleGradient = getRoleGradient(user.role);

  return (
    <header className="h-16 border-b border-slate-100 bg-white shadow-sm flex items-center px-6 gap-4 sticky top-0 z-40">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search students, staff, classes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-50/50 border-slate-200 focus:bg-white"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-indigo-600" asChild>
          <Link href="/communication/notifications">
            <Bell className="h-4 w-4" />
            {liveNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full bg-red-500 text-white font-medium">
                {liveNotificationCount > 99 ? "99+" : liveNotificationCount}
              </span>
            )}
          </Link>
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-slate-50">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
                <AvatarFallback className={cn("text-xs text-white bg-gradient-to-br", roleGradient)}>
                  {getInitials(user.name ?? user.email ?? "U")}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium text-slate-800 leading-none">
                  {user.name ?? user.email}
                </span>
                <span className="text-xs text-slate-500 mt-0.5">
                  {getRoleLabel(user.role)}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400 hidden md:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-red-600 focus:text-red-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function cn(...inputs: (string | undefined | false)[]) {
  return inputs.filter(Boolean).join(" ");
}

function useNotificationStream(initialCount: number) {
  const [count, setCount] = useState(initialCount);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    fetch("/api/notifications/stream", { signal: controller.signal })
      .then((res) => {
        if (!res.ok || !res.body) return;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        const read = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = decoder.decode(value, { stream: true });
            const lines = text.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.type === "unread_count") {
                    setCount(data.count);
                  }
                } catch {
                  /* ignore parse errors for partial chunks */
                }
              }
            }
          }
        };
        read();
      })
      .catch(() => {
        // SSE connection failed or aborted; fall back to initial count
      });

    return () => {
      controller.abort();
    };
  }, []);

  // Update when the initial prop changes (page navigation)
  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  return count;
}