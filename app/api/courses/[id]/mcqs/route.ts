import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { db } from "@/config/db";
import {
  usersTable,
  coursesTable,
} from "@/config/schema";
import { getOrCreateCourseMCQs } from "@/lib/course-mcq-store";

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const courseId = Number(id);

  if (!Number.isInteger(courseId)) {
    return NextResponse.json(
      { message: "Invalid course ID" },
      { status: 400 }
    );
  }

  const user = await currentUser();

  if (!user) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }

  const [dbUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, user.id));

  if (!dbUser) {
    return NextResponse.json(
      { message: "User not found" },
      { status: 404 }
    );
  }

  const [course] = await db
    .select()
    .from(coursesTable)
    .where(eq(coursesTable.id, courseId));

  if (!course || course.userId !== dbUser.id) {
    return NextResponse.json(
      { message: "Course not found" },
      { status: 404 }
    );
  }

  const mcqs = await getOrCreateCourseMCQs(courseId);

  return NextResponse.json({
    questions: mcqs,
  });
}