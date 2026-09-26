import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/config/db";
import { usersTable, coursesTable, chaptersTable } from "@/config/schema";

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.clerkId, user.id));
  if (!dbUser) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, Number(id)));
  if (!course || course.userId !== dbUser.id) {
    return NextResponse.json({ message: "Course not found" }, { status: 404 });
  }

  const chapters = await db
    .select({
      id: chaptersTable.id,
      chapterOrder: chaptersTable.chapterOrder,
      title: chaptersTable.title,
      subContent: chaptersTable.subContent,
      script: chaptersTable.script,
      videoStatus: chaptersTable.videoStatus,
    })
    .from(chaptersTable)
    .where(eq(chaptersTable.courseId, course.id))
    .orderBy(chaptersTable.chapterOrder);

  return NextResponse.json({ chapters });
}
