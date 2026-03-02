import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";

// ─────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────

const preferencesSchema = z.object({
  email: z.boolean(),
  push: z.boolean(),
  types: z.object({
    attendance: z.boolean(),
    assignments: z.boolean(),
    exams: z.boolean(),
    fees: z.boolean(),
    announcements: z.boolean(),
    events: z.boolean(),
    messages: z.boolean(),
  }),
});

// Default preferences
const defaultPreferences = {
  email: true,
  push: true,
  types: {
    attendance: true,
    assignments: true,
    exams: true,
    fees: true,
    announcements: true,
    events: true,
    messages: true,
  },
};

// ─────────────────────────────────────────────
// GET /api/notifications/preferences
// ─────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // In a real implementation, you would fetch from database
  // For now, return default preferences
  return NextResponse.json({ preferences: defaultPreferences });
}

// ─────────────────────────────────────────────
// PUT /api/notifications/preferences
// ─────────────────────────────────────────────

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = preferencesSchema.parse(body);

    // In a real implementation, you would save to database
    // For now, just return the submitted preferences
    return NextResponse.json({
      message: "Preferences updated successfully",
      preferences: data,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[PUT /api/notifications/preferences]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
