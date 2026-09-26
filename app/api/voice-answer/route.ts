import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { logApiError } from "@/lib/log-api-error";

const VOICE_ANSWER_PROMPT = `You are a quick voice Q&A assistant inside an educational app used heavily by people with motor and visual impairments who ask questions hands-free.
Answer the user's question clearly and correctly in 2-4 short sentences.
This will be read aloud by text-to-speech, so:
Never use markdown, code syntax, symbols, bullet points, or headings.
Never include parentheses, brackets, or punctuation a screen reader would mispronounce.
Speak in plain, natural spoken English only.`;

export async function POST(req: NextRequest) {
  const { question } = await req.json();
  if (!question || typeof question !== "string") {
    return NextResponse.json({ message: "question is required" }, { status: 400 });
  }

  try {
    const { text } = await generateText({
      model: google("gemini-3.5-flash-lite"),
      system: VOICE_ANSWER_PROMPT,
      prompt: question,
    });

    return NextResponse.json({ answer: text.trim() });
  } catch (error) {
    logApiError("Gemini (voice answer)", error);
    return NextResponse.json({ message: "Couldn't get an answer" }, { status: 502 });
  }
}
