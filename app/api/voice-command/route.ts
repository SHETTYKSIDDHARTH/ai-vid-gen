import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { logApiError } from "@/lib/log-api-error";

const VOICE_COMMAND_PROMPT = `You are a voice command interpreter for "AI Video Course Generator", an app where users generate video courses from a topic. Many users rely on this entirely by voice due to motor impairments, so classify generously and don't default to "unknown" unless truly nothing matches.
The user has just spoken an instruction after pressing the mic. Classify it into exactly ONE action.

Actions:
- "navigate": user wants to go to a page/tab. Set target to "home", "generate", or "my-courses".
- "generate_course": user wants to create a new course. Extract the topic exactly as they described it. If they said "quick", "short", or "explain video", set courseType to "quick-explain-video". Otherwise set courseType to "full-course".
- "delete_course": user wants to delete the course they are currently viewing.
- "read_page": user wants the current page's content read aloud to them.
- "download_notes": user wants to download the notes/PDF for the course they are currently viewing.
- "chapter_action": user wants to play, retry, or hear the notes of a SPECIFIC chapter by number, e.g. "play chapter 2", "retry chapter 3's video", "read me chapter 1". Set chapterNumber (1-indexed, as spoken) and operation to "play", "retry", or "read".
- "ask_question": user is asking a general question they want answered out loud right now (not about navigating or generating a course). Set question to what they asked, verbatim.
- "stop_listening": user wants to end the voice session / says things like "stop", "no", "that's all", "nothing else", "cancel".
- "unknown": the instruction doesn't clearly match any of the above.

Only extract information the user actually said. Do not invent a topic if none was mentioned.
Return ONLY the structured JSON.`;

const voiceIntentSchema = z.object({
  action: z.enum([
    "navigate",
    "generate_course",
    "delete_course",
    "read_page",
    "download_notes",
    "chapter_action",
    "ask_question",
    "stop_listening",
    "unknown",
  ]),
  target: z.enum(["home", "generate", "my-courses"]).optional(),
  topic: z.string().optional(),
  courseType: z.enum(["full-course", "quick-explain-video"]).optional(),
  chapterNumber: z.number().optional(),
  operation: z.enum(["play", "retry", "read"]).optional(),
  question: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { transcript } = await req.json();
  if (!transcript || typeof transcript !== "string") {
    return NextResponse.json({ message: "transcript is required" }, { status: 400 });
  }

  try {
    const { object } = await generateObject({
      model: google("gemini-3.5-flash-lite"),
      schema: voiceIntentSchema,
      system: VOICE_COMMAND_PROMPT,
      prompt: `User said: "${transcript}"`,
    });

    return NextResponse.json({ intent: object });
  } catch (error) {
    logApiError("Gemini (voice command)", error);
    return NextResponse.json({ message: "Voice command classification failed" }, { status: 502 });
  }
}
