import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/config/db";
import { usersTable, coursesTable } from "@/config/schema";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";
import DeleteCourseButton from "@/app/_components/DeleteCourseButton";
import DownloadNotesButton from "@/app/_components/DownloadNotesButton";

async function CourseList() {
  const user = await currentUser();
  if (!user) {
    return null;
  }

  const [dbUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, user.id));

  const courses = dbUser
    ? await db
        .select()
        .from(coursesTable)
        .where(eq(coursesTable.userId, dbUser.id))
        .orderBy(desc(coursesTable.createdAt))
    : [];

  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 text-muted-foreground">
        <BookOpen className="size-8 mb-3 text-primary/60" />
        <p>No courses yet — generate your first one from the Generate tab.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {courses.map((course) => (
        <div
          key={course.id}
          className="relative p-5 border border-border/80 rounded-2xl bg-card hover:border-primary/40 transition-colors"
        >
          <div className="absolute top-3 right-3 flex items-center gap-1">
            <DownloadNotesButton courseId={course.id} iconOnly />
            <DeleteCourseButton courseId={course.id} courseTitle={course.title} />
          </div>
          <Link href={`/course/${course.id}`} className="flex flex-col gap-3 pr-16">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{course.level}</Badge>
              <span className="text-xs text-muted-foreground">{course.totalChapters} chapters</span>
            </div>
            <h3 className="font-semibold font-heading line-clamp-2">{course.title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
          </Link>
        </div>
      ))}
    </div>
  );
}

export default CourseList;
