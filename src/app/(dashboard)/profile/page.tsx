import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProfileClient } from "@/components/profile/profile-client";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Fetch user profile
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      schoolId: true,
      School: {
        select: { name: true, code: true },
      },
      Staff: {
        select: {
          employeeId: true,
          department: true,
          designation: true,
          phone: true,
          address: true,
        },
      },
      Student: {
        select: {
          studentId: true,
          Section: {
            select: {
              name: true,
              Class: { select: { name: true } },
            },
          },
        },
      },
      Parent: {
        select: {
          phone: true,
          address: true,
        },
      },
    },
  });

  if (!user) redirect("/login");

  // Merge phone and address from role-specific tables
  const profile = {
    ...user,
    school: user.School,
    phone: user.Staff?.phone || user.Parent?.phone || undefined,
    address: user.Staff?.address || user.Parent?.address || undefined,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">View and manage your profile information</p>
      </div>

      <ProfileClient initialProfile={profile} />
    </div>
  );
}
