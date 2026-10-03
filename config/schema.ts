import { integer, pgTable, real, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  lastName: varchar({ length: 255 }),
  email: varchar({ length: 255 }).notNull().unique(),
  clerkId: varchar({ length: 255 }).notNull().unique(),
  credits: integer().default(2)
});

export const coursesTable = pgTable("courses", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer().notNull().references(() => usersTable.id),
  topic: text().notNull(),
  courseType: varchar({ length: 50 }).notNull(),
  courseSlug: varchar({ length: 255 }),
  title: varchar({ length: 255 }),
  description: text(),
  level: varchar({ length: 50 }),
  totalChapters: integer(),
  status: varchar({ length: 50 }).notNull().default("draft"),
  createdAt: timestamp().notNull().defaultNow(),
});

export const chaptersTable = pgTable("chapters", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  courseId: integer().notNull().references(() => coursesTable.id),
  chapterOrder: integer().notNull(),
  chapterSlug: varchar({ length: 255 }),
  title: varchar({ length: 255 }).notNull(),
  subContent: text().array(),
  script: text(),
  audioUrl: varchar({ length: 500 }),
  audioDurationSec: real(),
  captionSegments: text(),
  videoUrl: varchar({ length: 500 }),
  videoStatus: varchar({ length: 50 }).notNull().default("pending"),
});

export const courseMcqsTable = pgTable("course_mcqs", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),

  courseId: integer()
    .notNull()
    .references(() => coursesTable.id, { onDelete: "cascade" }),

  questionOrder: integer().notNull(),

  question: text().notNull(),

  options: text().array().notNull(),

  answer: text().notNull(),
});