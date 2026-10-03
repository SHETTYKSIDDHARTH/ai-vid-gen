CREATE TABLE "course_mcqs" (
        "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "course_mcqs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
        "courseId" integer NOT NULL,
        "questionOrder" integer NOT NULL,
        "question" text NOT NULL,
        "options" text[] NOT NULL,
        "answer" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "course_mcqs" ADD CONSTRAINT "course_mcqs_courseId_courses_id_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE;
