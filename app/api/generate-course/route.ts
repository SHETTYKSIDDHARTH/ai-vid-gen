import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { generateObject, generateText } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { usersTable, coursesTable, chaptersTable } from "@/config/schema";
import { db } from "@/config/db";
import { bundleRemotionProject, generateChapterMedia } from "@/lib/course-media";
import { logApiError } from "@/lib/log-api-error";

const COURSE_CONFIG_PROMPT = `You are an expert AI Course Architect for an AI-powered Video Course Generator platform.
Your task is to generate a structured, clean, and production-ready COURSE CONFIGURATION in JSON format.

IMPORTANT RULES:
Output ONLY valid JSON (no markdown, no explanation).
Do NOT include slides, HTML, TailwindCSS, animations, or audio text yet.
This config will be used in the NEXT step to generate animated slides and TTS narration.
Keep everything beginner-friendly and well-structured.
Limit each chapter to MAXIMUM 3 subContent points.
Each chapter should be suitable for 1–3 short animated slides.
Decide the number of chapters based on how much the topic actually needs to be taught well — do not artificially pad or artificially limit the count.

COURSE CONFIG STRUCTURE REQUIREMENTS:
Top-level fields:
courseId (short, slug-like string)
courseName
courseDescription (2–3 lines, simple & engaging)
level (Beginner | Intermediate | Advanced)
totalChapters (number)
chapters (array):
Each chapter object must contain:
chapterId (slug-style, unique)
chapterTitle
subContent (array of strings, max 3 items)

CONTENT GUIDELINES:
Chapters should follow a logical learning flow
SubContent points should be:
Simple
Slide-friendly
Easy to convert into narration later
Avoid overly long sentences
Avoid emojis
Avoid marketing fluff

OUTPUT:
Return ONLY the JSON object.`;

function buildCourseOutlineSchema(minChapters: number) {
  return z.object({
    courseId: z.string(),
    courseName: z.string(),
    courseDescription: z.string(),
    level: z.enum(["Beginner", "Intermediate", "Advanced"]),
    totalChapters: z.number(),
    chapters: z.array(
      z.object({
        chapterId: z.string(),
        chapterTitle: z.string(),
        subContent: z.array(z.string()).max(3),
      })
    ).min(minChapters),
  });
}

type CourseOutline = z.infer<ReturnType<typeof buildCourseOutlineSchema>>;

async function generateCourseOutline(topic: string, courseType: string): Promise<CourseOutline> {
  const isQuick = courseType === "quick-explain-video";
  const minChapters = isQuick ? 1 : 5;

  const chapterInstruction = isQuick
    ? "Generate exactly 1 chapter."
    : "Generate AT LEAST 5 chapters. Add more than 5 only if the topic genuinely needs deeper breakdown to be taught well.";

  try {
    const { object } = await generateObject({
      model: google("gemini-3.5-flash-lite"),
      schema: buildCourseOutlineSchema(minChapters),
      system: COURSE_CONFIG_PROMPT,
      prompt: `User's course topic: "${topic}". ${chapterInstruction}`,
    });

    return object;
  } catch (error) {
    logApiError("Gemini (course outline)", error);
    throw error;
  }
}

const NARRATION_PROMPT = `You are a scriptwriter for an in-depth educational video.
Turn the given chapter's bullet points into a natural, spoken-style narration script that thoroughly teaches the material.

RULES:
Output ONLY the narration text, no markdown, no headings, no labels.
Write like someone speaking aloud to a beginner, explaining each bullet point in real depth, with examples or analogies where they help understanding.
Explain each bullet point with roughly 3-4 sentences of real explanation, not just a rephrase of the bullet itself.
Flow naturally from one bullet point to the next, as one continuous explanation rather than disconnected fragments.
Avoid emojis and marketing language.
This narration will be read aloud by a text-to-speech engine, so it must be pure spoken prose:
Never include literal code syntax, function calls, symbols, or punctuation a screen reader would mispronounce (no parentheses, brackets, plus/equals signs, semicolons, camelCase identifiers written as code, etc.).
Describe code concepts entirely in plain spoken English instead. For example, say "calling the set count function and adding one to the current count" rather than writing "setCount(count + 1)".`;

async function generateChapterScript(
  courseTopic: string,
  chapterTitle: string,
  subContent: string[]
): Promise<string> {
  try {
    const { text } = await generateText({
      model: google("gemini-3.5-flash-lite"),
      system: NARRATION_PROMPT,
      prompt: `Course topic: "${courseTopic}"\nChapter: "${chapterTitle}"\nBullet points:\n${subContent
        .map((point) => `- ${point}`)
        .join("\n")}`,
    });

    return text.trim();
  } catch (error) {
    logApiError("Gemini (narration script)", error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { topic, courseType } = await req.json();
  if (!topic || !courseType) {
    return NextResponse.json({ message: "topic and courseType are required" }, { status: 400 });
  }

  const [dbUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, user.id));

  if (!dbUser) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  if ((dbUser.credits ?? 0) <= 0) {
    return NextResponse.json({ message: "Out of credits" }, { status: 403 });
  }

  const outline = await generateCourseOutline(topic, courseType);

  const [course] = await db
    .insert(coursesTable)
    .values({
      userId: dbUser.id,
      topic,
      courseType,
      courseSlug: outline.courseId,
      title: outline.courseName,
      description: outline.courseDescription,
      level: outline.level,
      totalChapters: outline.totalChapters,
      status: "ready",
    })
    .returning();

  const scripts = await Promise.all(
    outline.chapters.map((chapter) =>
      generateChapterScript(topic, chapter.chapterTitle, chapter.subContent)
    )
  );

  const chapterRows = outline.chapters.map((chapter, index) => ({
    courseId: course.id,
    chapterOrder: index,
    chapterSlug: chapter.chapterId,
    title: chapter.chapterTitle,
    subContent: chapter.subContent,
    script: scripts[index],
    videoStatus: "pending",
  }));

  const insertedChapters = await db.insert(chaptersTable).values(chapterRows).returning();

  await db
    .update(usersTable)
    .set({ credits: (dbUser.credits ?? 0) - 1 })
    .where(eq(usersTable.id, dbUser.id));

  after(async () => {
    const bundleLocation = await bundleRemotionProject();
    for (const chapter of insertedChapters) {
      try {
        await generateChapterMedia(chapter, bundleLocation);
      } catch (error) {
        console.error(`Failed to generate media for chapter ${chapter.id}:`, error);
      }
    }
  });

  return NextResponse.json({ course, chapters: insertedChapters });
}
