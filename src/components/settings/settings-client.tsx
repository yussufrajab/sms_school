"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  Bell,
  Shield,
  School,
  Save,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface NotificationPreferences {
  email: boolean;
  push: boolean;
  attendance: boolean;
  assignments: boolean;
  exams: boolean;
  fees: boolean;
  announcements: boolean;
  events: boolean;
}

interface SchoolSettings {
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  timezone: string;
  currency: string;
  studentIdFormat: string;
  employeeIdFormat: string;
}

interface SettingsData {
  notificationPreferences: NotificationPreferences;
  school?: SchoolSettings | null;
  isAdmin: boolean;
}

const timezones = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Shanghai", label: "China (CST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

const currencies = [
  { value: "USD", label: "US Dollar ($)" },
  { value: "EUR", label: "Euro (€)" },
  { value: "GBP", label: "British Pound (£)" },
  { value: "AED", label: "UAE Dirham (د.إ)" },
  { value: "INR", label: "Indian Rupee (₹)" },
  { value: "CNY", label: "Chinese Yuan (¥)" },
  { value: "JPY", label: "Japanese Yen (¥)" },
  { value: "AUD", label: "Australian Dollar ($)" },
];

export function SettingsClient({ initialSettings }: { initialSettings: SettingsData | null }) {
  const [settings, setSettings] = useState<SettingsData | null>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [savingSchool, setSavingSchool] = useState(false);

  // Notification preferences state
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    email: true,
    push: true,
    attendance: true,
    assignments: true,
    exams: true,
    fees: true,
    announcements: true,
    events: true,
  });

  // School settings state
  const [school, setSchool] = useState<SchoolSettings | null>(null);

  useEffect(() => {
    if (settings) {
      setNotifications(settings.notificationPreferences);
      if (settings.school) {
        setSchool(settings.school);
      }
    }
  }, [settings]);

  const handleNotificationChange = (key: keyof NotificationPreferences, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationPreferences: notifications }),
      });

      if (!res.ok) throw new Error("Failed to save settings");

      toast.success("Notification preferences saved");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSchool = async () => {
    if (!school) return;
    
    setSavingSchool(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ school }),
      });

      if (!res.ok) throw new Error("Failed to save school settings");

      toast.success("School settings saved");
    } catch (error) {
      toast.error("Failed to save school settings");
    } finally {
      setSavingSchool(false);
    }
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="notifications" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
        <TabsTrigger value="notifications" className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Notifications
        </TabsTrigger>
        {settings.isAdmin && (
          <TabsTrigger value="school" className="flex items-center gap-2">
            <School className="h-4 w-4" />
            School
          </TabsTrigger>
        )}
      </TabsList>

      {/* Notification Preferences */}
      <TabsContent value="notifications">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Choose how and when you want to receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Delivery Methods */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Delivery Methods</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    id="email"
                    checked={notifications.email}
                    onCheckedChange={(checked) => handleNotificationChange("email", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="push">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive in-app notifications
                    </p>
                  </div>
                  <Switch
                    id="push"
                    checked={notifications.push}
                    onCheckedChange={(checked) => handleNotificationChange("push", checked)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Notification Types */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Notification Types</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Attendance Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Attendance updates and absences
                    </p>
                  </div>
                  <Switch
                    checked={notifications.attendance}
                    onCheckedChange={(checked) => handleNotificationChange("attendance", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Assignments</Label>
                    <p className="text-sm text-muted-foreground">
                      New assignments and deadlines
                    </p>
                  </div>
                  <Switch
                    checked={notifications.assignments}
                    onCheckedChange={(checked) => handleNotificationChange("assignments", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Exams</Label>
                    <p className="text-sm text-muted-foreground">
                      Exam schedules and results
                    </p>
                  </div>
                  <Switch
                    checked={notifications.exams}
                    onCheckedChange={(checked) => handleNotificationChange("exams", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Fees</Label>
                    <p className="text-sm text-muted-foreground">
                      Payment reminders and receipts
                    </p>
                  </div>
                  <Switch
                    checked={notifications.fees}
                    onCheckedChange={(checked) => handleNotificationChange("fees", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Announcements</Label>
                    <p className="text-sm text-muted-foreground">
                      School announcements and notices
                    </p>
                  </div>
                  <Switch
                    checked={notifications.announcements}
                    onCheckedChange={(checked) => handleNotificationChange("announcements", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Events</Label>
                    <p className="text-sm text-muted-foreground">
                      School events and activities
                    </p>
                  </div>
                  <Switch
                    checked={notifications.events}
                    onCheckedChange={(checked) => handleNotificationChange("events", checked)}
                  />
                </div>
              </div>
            </div>

            <Button onClick={handleSaveNotifications} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Preferences
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* School Settings (Admin Only) */}
      {settings.isAdmin && school && (
        <TabsContent value="school">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <School className="h-5 w-5" />
                School Settings
              </CardTitle>
              <CardDescription>
                Configure your school&apos;s basic information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="school-name">School Name</Label>
                  <Input
                    id="school-name"
                    value={school.name}
                    onChange={(e) => setSchool({ ...school, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-code">School Code</Label>
                  <Input
                    id="school-code"
                    value={school.code}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-phone">Phone</Label>
                  <Input
                    id="school-phone"
                    value={school.phone || ""}
                    onChange={(e) => setSchool({ ...school, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-email">Email</Label>
                  <Input
                    id="school-email"
                    type="email"
                    value={school.email || ""}
                    onChange={(e) => setSchool({ ...school, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="school-address">Address</Label>
                  <Input
                    id="school-address"
                    value={school.address || ""}
                    onChange={(e) => setSchool({ ...school, address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-website">Website</Label>
                  <Input
                    id="school-website"
                    type="url"
                    value={school.website || ""}
                    onChange={(e) => setSchool({ ...school, website: e.target.value })}
                    placeholder="https://"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={school.timezone}
                    onValueChange={(value) => setSchool({ ...school, timezone: value })}
                  >
                    <SelectTrigger id="timezone">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={school.currency}
                    onValueChange={(value) => setSchool({ ...school, currency: value })}
                  >
                    <SelectTrigger id="currency">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-id-format">Student ID Format</Label>
                  <Input
                    id="student-id-format"
                    value={school.studentIdFormat}
                    onChange={(e) => setSchool({ ...school, studentIdFormat: e.target.value })}
                    placeholder="SMS-{YEAR}-{SEQ5}"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use {"{YEAR}"} for year and {"{SEQ}"} for sequence number
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employee-id-format">Employee ID Format</Label>
                  <Input
                    id="employee-id-format"
                    value={school.employeeIdFormat}
                    onChange={(e) => setSchool({ ...school, employeeIdFormat: e.target.value })}
                    placeholder="EMP-{YEAR}-{SEQ4}"
                  />
                </div>
              </div>

              <Button onClick={handleSaveSchool} disabled={savingSchool}>
                {savingSchool ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save School Settings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      )}
    </Tabs>
  );
}
