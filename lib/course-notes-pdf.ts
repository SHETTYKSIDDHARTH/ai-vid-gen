import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 56;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

type Chapter = {
  chapterOrder: number;
  title: string;
  subContent: string[] | null;
  script: string | null;
};

type Course = {
  title: string | null;
  description: string | null;
  level: string | null;
  totalChapters: number | null;
};

type QAItem = {
  question: string;
  answer: string;
};

type MCQItem = {
  question: string;
  options: string[];
  answer: string;
};

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (
      font.widthOfTextAtSize(candidate, size) > maxWidth &&
      current
    ) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) lines.push(current);

  return lines;
}

export async function generateCourseNotesPdf(
  course: Course,
  chapters: Chapter[],
  qa: QAItem[] = [],
  mcqs: MCQItem[] = []
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page: PDFPage = pdfDoc.addPage([
    PAGE_WIDTH,
    PAGE_HEIGHT,
  ]);

  let y = PAGE_HEIGHT - MARGIN;

  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN) {
      page = pdfDoc.addPage([
        PAGE_WIDTH,
        PAGE_HEIGHT,
      ]);

      y = PAGE_HEIGHT - MARGIN;
    }
  };

  const drawWrapped = (
    text: string,
    font: PDFFont,
    size: number,
    lineGap: number,
    color = rgb(0.1, 0.1, 0.1)
  ) => {
    const lines = wrapText(
      text,
      font,
      size,
      CONTENT_WIDTH
    );

    for (const line of lines) {
      ensureSpace(size + lineGap);

      page.drawText(line, {
        x: MARGIN,
        y,
        size,
        font,
        color,
      });

      y -= size + lineGap;
    }
  };

  drawWrapped(
    course.title ?? "Untitled Course",
    boldFont,
    22,
    8
  );

  y -= 6;

  if (course.description) {
    drawWrapped(
      course.description,
      regularFont,
      12,
      6,
      rgb(0.35, 0.35, 0.35)
    );
  }

  ensureSpace(20);

  page.drawText(
    `${course.level ?? ""}  ·  ${
      course.totalChapters ?? chapters.length
    } chapters`,
    {
      x: MARGIN,
      y,
      size: 10,
      font: regularFont,
      color: rgb(0.5, 0.5, 0.5),
    }
  );

  y -= 30;

  for (const chapter of chapters) {
    ensureSpace(40);

    drawWrapped(
      `${chapter.chapterOrder + 1}. ${chapter.title}`,
      boldFont,
      15,
      6
    );

    y -= 4;

    for (const point of chapter.subContent ?? []) {
      drawWrapped(
        `•  ${point}`,
        regularFont,
        11,
        5
      );
    }

    y -= 6;

    if (chapter.script) {
      drawWrapped(
        chapter.script,
        regularFont,
        11,
        5,
        rgb(0.25, 0.25, 0.25)
      );
    }

    y -= 20;
  }

  if (qa.length > 0) {
    ensureSpace(50);

    drawWrapped(
      "Review Questions",
      boldFont,
      18,
      8,
      rgb(0.1, 0.1, 0.1)
    );

    y -= 8;

    qa.forEach((item, index) => {
      ensureSpace(30);

      drawWrapped(
        `${index + 1}. ${item.question}`,
        boldFont,
        12,
        5
      );

      drawWrapped(
        `Answer: ${item.answer}`,
        regularFont,
        11,
        5,
        rgb(0.3, 0.3, 0.3)
      );

      y -= 12;
    });
  }

  if (mcqs.length > 0) {
    ensureSpace(60);

    drawWrapped(
      "Multiple Choice Questions",
      boldFont,
      18,
      8,
      rgb(0.1, 0.1, 0.1)
    );

    y -= 8;

    mcqs.forEach((item, index) => {
      ensureSpace(50);

      drawWrapped(
        `${index + 1}. ${item.question}`,
        boldFont,
        12,
        5
      );

      item.options.forEach((option, optionIndex) => {
        const letter = String.fromCharCode(65 + optionIndex);

        drawWrapped(
          `${letter}. ${option}`,
          regularFont,
          11,
          4,
          rgb(0.25, 0.25, 0.25)
        );
      });

      drawWrapped(
        `Answer: ${item.answer}`,
        boldFont,
        11,
        5
      );

      y -= 14;
    });
  }

  return pdfDoc.save();
}