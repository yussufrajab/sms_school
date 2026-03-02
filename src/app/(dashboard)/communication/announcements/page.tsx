import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AnnouncementsClient } from "@/components/communication/announcements-client";

export const metadata = { title: "Announcements" };

const ADMIN_ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN"] as const;
const CREATE_ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"] as const;

export default async function AnnouncementsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userRole = session.user.role;
  const schoolId = session.user.schoolId;

  const isAdmin = ADMIN_ROLES.includes(userRole as (typeof ADMIN_ROLES)[number]);

  const where = {
    ...(schoolId ? { schoolId } : {}),
    isPublished: true,
    // Non-admins only see announcements targeted to their role or to all
    ...(!isAdmin
      ? {
          OR: [
            { targetRole: null },
            { targetRole: userRole },
          ],
        }
      : {}),
  };

  // Fetch initial announcements (SSR seed)
  const initialAnnouncements = await prisma.announcement.findMany({
    where,
    take: 20,
    orderBy: { publishedAt: "desc" },
    include: {
      User: {
        select: {
          id: true,
          name: true,
          image: true,
          role: true,
        },
      },
    },
  });

  const totalAnnouncements = await prisma.announcement.count({ where });

  const canCreate = CREATE_ROLES.includes(userRole as (typeof CREATE_ROLES)[number]);

  return (
    <AnnouncementsClient
      initialAnnouncements={initialAnnouncements.map((a) => ({
        ...a,
        publishedAt: a.publishedAt.toISOString(),
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
        author: {
          id: a.User.id,
          name: a.User.name,
          image: a.User.image,
          role: a.User.role,
        },
      }))}
      initialTotal={totalAnnouncements}
      userRole={userRole}
      canCreate={canCreate}
    />
  );
}
