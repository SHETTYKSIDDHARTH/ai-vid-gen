import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/config/db";
import { usersTable, coursesTable, chaptersTable } from "@/config/schema";
import cloudinary, { extractCloudinaryPublicId } from "@/lib/cloudinary";
import { logApiError } from "@/lib/log-api-error";

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
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

  const chapters = await db.select().from(chaptersTable).where(eq(chaptersTable.courseId, course.id));

  await Promise.all(
    chapters.flatMap((chapter) =>
      [chapter.audioUrl, chapter.videoUrl]
        .filter((url): url is string => !!url)
        .map((url) => {
          const publicId = extractCloudinaryPublicId(url);
          if (!publicId) return Promise.resolve();
          return cloudinary.uploader
            .destroy(publicId, { resource_type: "video" })
            .catch((error) => logApiError("Cloudinary (delete)", error));
        })
    )
  );

  await db.delete(chaptersTable).where(eq(chaptersTable.courseId, course.id));
  await db.delete(coursesTable).where(eq(coursesTable.id, course.id));

  return NextResponse.json({ message: "Course deleted" });
}
