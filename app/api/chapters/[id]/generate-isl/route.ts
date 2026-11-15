import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { chaptersTable } from "@/config/schema";
import { db } from "@/config/db";
import { bundleRemotionProject } from "@/lib/course-media";
import { generateISLChapterVideo } from "@/lib/isl-media";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const chapterId = Number(id);

  const [chapter] = await db
    .select()
    .from(chaptersTable)
    .where(eq(chaptersTable.id, chapterId));

  if (!chapter) {
    return NextResponse.json({ message: "Chapter not found" }, { status: 404 });
  }

  try {
    const bundleLocation = await bundleRemotionProject();
    await generateISLChapterVideo(chapter, bundleLocation);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`ISL video generation failed for chapter ${chapterId}:`, error);
    return NextResponse.json(
      { message: "ISL video generation failed" },
      { status: 500 }
    );
  }
}
