import { asc, eq } from "drizzle-orm";

import { db } from "@/config/db";
import {
  chaptersTable,
  courseMcqsTable,
  coursesTable,
} from "@/config/schema";
import { generateCourseMCQs, MCQItem } from "@/lib/course-mcq";

export async function getCourseMCQs(
  courseId: number
): Promise<MCQItem[]> {
  const existing = await db
    .select()
    .from(courseMcqsTable)
    .where(eq(courseMcqsTable.courseId, courseId))
    .orderBy(asc(courseMcqsTable.questionOrder));

  return existing.map((item) => ({
    question: item.question,
    options: item.options,
    answer: item.answer,
  }));
}

export async function getOrCreateCourseMCQs(
  courseId: number
): Promise<MCQItem[]> {
  const existing = await getCourseMCQs(courseId);

  if (existing.length === 10) {
    return existing;
  }

  const [course] = await db
    .select()
    .from(coursesTable)
    .where(eq(coursesTable.id, courseId));

  if (!course) {
    return [];
  }

  const chapters = await db
    .select()
    .from(chaptersTable)
    .where(eq(chaptersTable.courseId, courseId))
    .orderBy(asc(chaptersTable.chapterOrder));

  const mcqs = await generateCourseMCQs(
    course.title ?? "",
    chapters
  );

  if (mcqs.length !== 10) {
    return [];
  }

  await db
    .delete(courseMcqsTable)
    .where(eq(courseMcqsTable.courseId, courseId));

  await db.insert(courseMcqsTable).values(
    mcqs.map((mcq, index) => ({
      courseId,
      questionOrder: index,
      question: mcq.question,
      options: mcq.options,
      answer: mcq.answer,
    }))
  );

  return mcqs;
}