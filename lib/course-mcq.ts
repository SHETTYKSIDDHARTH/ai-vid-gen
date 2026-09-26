import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { logApiError } from "@/lib/log-api-error";

const MCQ_PROMPT = `You are creating multiple-choice questions for a student's course notes PDF.

Given the course chapters below, generate exactly 10 MCQs covering the most important concepts across the course.

RULES:
- Generate exactly 10 questions.
- Each question must have exactly 4 options.
- Only one option can be correct.
- Questions should test understanding, not trivial memorization.
- Cover different chapters and important concepts.
- Avoid duplicate or very similar questions.
- Keep questions and options concise.
- The correct answer must exactly match one of the four options.`;

const mcqSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()).length(4),
      answer: z.string(),
    })
  ).length(10),
});

export type MCQItem = {
  question: string;
  options: string[];
  answer: string;
};

export async function generateCourseMCQs(
  courseTitle: string,
  chapters: { title: string; subContent: string[] | null }[]
): Promise<MCQItem[]> {
  if (chapters.length === 0) return [];

  const chapterSummaries = chapters
    .map(
      (chapter, index) =>
        `Chapter ${index + 1}: ${chapter.title}\n${(chapter.subContent ?? []).join("\n")}`
    )
    .join("\n\n");

  try {
    const { object } = await generateObject({
      model: google("gemini-3.5-flash-lite"),
      schema: mcqSchema,
      system: MCQ_PROMPT,
      prompt: `Course: "${courseTitle}"\n\n${chapterSummaries}`,
    });

    return object.questions;
  } catch (error) {
    logApiError("Gemini (course MCQs)", error);
    return [];
  }
}