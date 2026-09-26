import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/config/db";
import { usersTable, coursesTable, chaptersTable } from "@/config/schema";
import { generateCourseNotesPdf } from "@/lib/course-notes-pdf";
import { generateCourseQA } from "@/lib/course-qa";
import { generateCourseMCQs } from "@/lib/course-mcq";
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
    .select()
    .from(chaptersTable)
    .where(eq(chaptersTable.courseId, course.id))
    .orderBy(chaptersTable.chapterOrder);

const [qa, mcqs] = await Promise.all([
  generateCourseQA(course.title ?? "", chapters),
  generateCourseMCQs(course.title ?? "", chapters),
]);

const pdfBytes = await generateCourseNotesPdf(
  course,
  chapters,
  qa,
  mcqs
);
  const fileName = `${(course.courseSlug || course.title || "course-notes").replace(/[^a-z0-9-]/gi, "-")}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
