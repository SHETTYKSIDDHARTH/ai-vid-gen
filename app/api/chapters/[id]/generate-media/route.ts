import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/config/db";
import { usersTable, coursesTable, chaptersTable } from "@/config/schema";
import { bundleRemotionProject, generateChapterMedia } from "@/lib/course-media";

export async function POST(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.clerkId, user.id));
  if (!dbUser) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  const [chapter] = await db.select().from(chaptersTable).where(eq(chaptersTable.id, Number(id)));
  if (!chapter) {
    return NextResponse.json({ message: "Chapter not found" }, { status: 404 });
  }

  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, chapter.courseId));
  if (!course || course.userId !== dbUser.id) {
    return NextResponse.json({ message: "Chapter not found" }, { status: 404 });
  }

  const bundleLocation = await bundleRemotionProject();
  await generateChapterMedia(chapter, bundleLocation);

  const [updatedChapter] = await db.select().from(chaptersTable).where(eq(chaptersTable.id, chapter.id));

  return NextResponse.json({ chapter: updatedChapter });
}
