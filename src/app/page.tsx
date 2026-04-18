import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  GraduationCap,
  Users,
  BookOpen,
  Calendar,
  DollarSign,
  Bus,
  Library,
  Shield,
  Smartphone,
  Globe,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Student Management",
    description: "Complete student lifecycle from enrollment to graduation",
  },
  {
    icon: BookOpen,
    title: "Academic Management",
    description: "Classes, subjects, timetables, assignments, and exams",
  },
  {
    icon: Calendar,
    title: "Attendance Tracking",
    description: "Daily attendance with real-time parent notifications",
  },
  {
    icon: DollarSign,
    title: "Fee Management",
    description: "Invoicing, payments, and financial reporting",
  },
  {
    icon: Library,
    title: "Library System",
    description: "Book catalog, borrowing, and fine management",
  },
  {
    icon: Bus,
    title: "Transport Management",
    description: "Route planning and vehicle tracking",
  },
];

const roles = [
  {
    title: "School Administrators",
    description: "Complete control over school operations, staff, and academics",
    icon: Shield,
  },
  {
    title: "Teachers",
    description: "Manage classes, record attendance, and grade assignments",
    icon: BookOpen,
  },
  {
    title: "Students",
    description: "Access timetables, submit assignments, and view results",
    icon: GraduationCap,
  },
  {
    title: "Parents",
    description: "Monitor child progress, pay fees, and communicate with teachers",
    icon: Users,
  },
];

export default async function HomePage() {
  // Redirect authenticated users to dashboard
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">SchoolMS</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#roles" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              User Roles
            </a>
            <a href="#contact" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/login">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
        <div className="container relative py-20 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Complete School Management{" "}
              <span className="text-primary">Solution</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              Streamline your school operations with our comprehensive management system.
              From enrollment to graduation, manage everything in one place.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/login">Start Managing Your School</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#features">Explore Features</a>
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {[
              { value: "500+", label: "Schools" },
              { value: "50K+", label: "Students" },
              { value: "5K+", label: "Teachers" },
              { value: "99.9%", label: "Uptime" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Powerful Features</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Everything you need to run your school efficiently
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="border-border/50 hover:border-primary/50 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* User Roles Section */}
      <section id="roles" className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Built for Everyone</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Role-specific dashboards and features for all stakeholders
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {roles.map((role) => {
              const Icon = role.icon;
              return (
                <Card key={role.title} className="relative overflow-hidden">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center">
                      <div className="p-3 rounded-full bg-primary/10 mb-4">
                        <Icon className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="font-semibold text-lg">{role.title}</h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        {role.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Highlights Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4">
              <Smartphone className="h-8 w-8 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-lg">Responsive Design</h3>
                <p className="text-primary-foreground/80 text-sm mt-1">
                  Access from any device - desktop, tablet, or mobile
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Shield className="h-8 w-8 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-lg">Secure & Reliable</h3>
                <p className="text-primary-foreground/80 text-sm mt-1">
                  Enterprise-grade security with role-based access control
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Globe className="h-8 w-8 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-lg">Multi-Language</h3>
                <p className="text-primary-foreground/80 text-sm mt-1">
                  Support for multiple languages and locales
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className="py-20">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold">Ready to Get Started?</h2>
            <p className="mt-4 text-muted-foreground">
              Join hundreds of schools already using SchoolMS to streamline their operations.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/login">Sign In to Your School</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <GraduationCap className="h-4 w-4" />
              </div>
              <span className="font-semibold">SchoolMS</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} School Management System. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
