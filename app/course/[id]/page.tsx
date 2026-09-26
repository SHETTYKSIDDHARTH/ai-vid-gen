import { eq } from "drizzle-orm";
import { db } from "@/config/db";
import { coursesTable, chaptersTable } from "@/config/schema";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { CheckCircle2 } from "lucide-react";
import ChapterMedia from "@/app/_components/ChapterMedia";
import CourseGenerationPoller from "@/app/_components/CourseGenerationPoller";
import DeleteCourseButton from "@/app/_components/DeleteCourseButton";
import DownloadNotesButton from "@/app/_components/DownloadNotesButton";

export default async function CoursePage(props: PageProps<"/course/[id]">) {
  const { id } = await props.params;

  const [course] = await db
    .select()
    .from(coursesTable)
    .where(eq(coursesTable.id, Number(id)));

  if (!course) {
    notFound();
  }

  const chapters = await db
    .select()
    .from(chaptersTable)
    .where(eq(chaptersTable.courseId, course.id))
    .orderBy(chaptersTable.chapterOrder);

  const isGenerating = chapters.some(
    (chapter) => chapter.videoStatus === "pending" || chapter.videoStatus === "processing"
  );

  return (
    <div className="max-w-3xl mx-auto py-14 px-4">
      <CourseGenerationPoller isGenerating={isGenerating} />
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{course.level}</Badge>
          <span className="text-xs text-muted-foreground">{course.totalChapters} chapters</span>
        </div>
        <div className="flex items-center gap-2">
          <DownloadNotesButton courseId={course.id} />
          <DeleteCourseButton courseId={course.id} courseTitle={course.title} redirectAfterDelete="/" />
        </div>
      </div>
      <h1 className="text-3xl md:text-4xl font-bold font-heading tracking-tight mb-3">{course.title}</h1>
      <p className="text-muted-foreground max-w-xl mb-10">{course.description}</p>

      <div className="flex flex-col gap-4">
        {chapters.map((chapter) => (
          <div
            key={chapter.id}
            data-chapter-id={chapter.id}
            data-chapter-order={chapter.chapterOrder + 1}
            className="p-5 border border-border/80 rounded-2xl bg-card hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="flex items-center justify-center size-8 rounded-full bg-primary/10 border border-primary/30 text-primary font-heading font-semibold text-sm shrink-0">
                {chapter.chapterOrder + 1}
              </span>
              <h2 className="text-lg font-semibold font-heading">{chapter.title}</h2>
            </div>
            <div>
              <ChapterMedia
                chapterId={chapter.id}
                videoUrl={chapter.videoUrl}
                videoStatus={chapter.videoStatus}
              />
            </div>
            {(chapter.subContent?.length || chapter.script) && (
              <Accordion className="mt-2">
                <AccordionItem value="details">
                  <AccordionTrigger>Chapter details</AccordionTrigger>
                  <AccordionContent>
                    {chapter.subContent && chapter.subContent.length > 0 && (
                      <ul className="flex flex-col gap-1.5 mb-4">
                        {chapter.subContent.map((point, i) => (
                          <li key={i} className="flex items-start gap-2 text-muted-foreground text-sm">
                            <CheckCircle2 className="size-4 mt-0.5 text-primary/70 shrink-0" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    )}
                    {chapter.script && (
                      <p className="text-sm text-muted-foreground/90 italic border-l-2 border-primary/30 pl-3">
                        {chapter.script}
                      </p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
