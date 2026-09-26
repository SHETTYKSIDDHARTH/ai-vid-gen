import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { logApiError } from "@/lib/log-api-error";

const QA_PROMPT = `You are creating short review questions and answers for the end of a student's course notes PDF.
Given the course chapters below, write one clear question and concise answer per chapter, testing understanding of that chapter's key point.

RULES:
Output plain English only, no markdown, no code syntax, no bullet symbols.
Questions should test understanding of the concept, not just repeat a bullet point verbatim.
Keep each answer to 1-3 sentences.`;

const qaSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      answer: z.string(),
    })
  ),
});

export async function generateCourseQA(
  courseTitle: string,
  chapters: { title: string; subContent: string[] | null }[]
): Promise<{ question: string; answer: string }[]> {
  if (chapters.length === 0) return [];

  const chapterSummaries = chapters
    .map((chapter, index) => `Chapter ${index + 1}: ${chapter.title}\n${(chapter.subContent ?? []).join("\n")}`)
    .join("\n\n");

  try {
    const { object } = await generateObject({
      model: google("gemini-3.5-flash-lite"),
      schema: qaSchema,
      system: QA_PROMPT,
      prompt: `Course: "${courseTitle}"\n\n${chapterSummaries}`,
    });

    return object.questions;
  } catch (error) {
    logApiError("Gemini (course Q&A)", error);
    return [];
  }
}
