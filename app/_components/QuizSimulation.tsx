"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Trophy,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type MCQ = {
  question: string;
  options: string[];
  answer: string;
};

type QuizSimulationProps = {
  courseId: number;
};

export default function QuizSimulation({
  courseId,
}: QuizSimulationProps) {
  const [questions, setQuestions] = useState<MCQ[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadQuiz() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/courses/${courseId}/mcqs`
        );

        if (!response.ok) {
          throw new Error("Failed to load quiz");
        }

        const data = await response.json();

        setQuestions(data.questions ?? []);
      } catch (error) {
        console.error(error);
        setError("Unable to load the quiz.");
      } finally {
        setLoading(false);
      }
    }

    loadQuiz();
  }, [courseId]);

  const selectAnswer = (answer: string) => {
    if (submitted) return;

    setAnswers((previous) => ({
      ...previous,
      [currentQuestion]: answer,
    }));
  };

  const resetQuiz = () => {
    setAnswers({});
    setCurrentQuestion(0);
    setStarted(true);
    setSubmitted(false);
  };

  const score = questions.reduce((total, question, index) => {
    return total + (answers[index] === question.answer ? 1 : 0);
  }, 0);

  if (loading) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          Preparing your quiz...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          No quiz questions are available yet.
        </p>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="rounded-2xl border bg-card p-8 md:p-10 text-center">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-primary/10">
          <Trophy className="size-7 text-primary" />
        </div>

        <h2 className="text-2xl font-bold font-heading">
          Quiz Simulation
        </h2>

        <p className="mt-2 text-muted-foreground">
          Test your understanding with 10 multiple-choice
          questions from this course.
        </p>

        <div className="mt-6 flex justify-center gap-6 text-sm text-muted-foreground">
          <span>10 Questions</span>
          <span>4 Options Each</span>
          <span>1 Correct Answer</span>
        </div>

        <Button
          className="mt-8"
          onClick={() => setStarted(true)}
        >
          Start Quiz
        </Button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border bg-card p-8 text-center">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-primary/10">
            <Trophy className="size-7 text-primary" />
          </div>

          <h2 className="text-2xl font-bold font-heading">
            Quiz Complete
          </h2>

          <p className="mt-3 text-4xl font-bold">
            {score} / {questions.length}
          </p>

          <p className="mt-2 text-muted-foreground">
            {Math.round((score / questions.length) * 100)}%
          </p>

          <Button
            variant="outline"
            className="mt-6"
            onClick={resetQuiz}
          >
            <RotateCcw className="size-4" />
            Retry Quiz
          </Button>
        </div>

        <div className="space-y-4">
          {questions.map((question, index) => {
            const selected = answers[index];
            const correct = selected === question.answer;

            return (
              <div
                key={index}
                className="rounded-2xl border bg-card p-5"
              >
                <div className="flex items-start gap-3">
                  {correct ? (
                    <CheckCircle2 className="mt-0.5 size-5 text-green-600 shrink-0" />
                  ) : (
                    <XCircle className="mt-0.5 size-5 text-destructive shrink-0" />
                  )}

                  <div className="flex-1">
                    <p className="font-semibold">
                      {index + 1}. {question.question}
                    </p>

                    <p className="mt-2 text-sm">
                      Your answer:{" "}
                      <span className="font-medium">
                        {selected ?? "Not answered"}
                      </span>
                    </p>

                    {!correct && (
                      <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                        Correct answer: {question.answer}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const selectedAnswer = answers[currentQuestion];

  const progress =
    ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-6 md:p-8">
        <div className="flex items-center justify-between gap-4 mb-3">
          <span className="text-sm font-medium">
            Question {currentQuestion + 1} of {questions.length}
          </span>

          <span className="text-sm text-muted-foreground">
            {Math.round(progress)}%
          </span>
        </div>

        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-6 md:p-8">
        <h2 className="text-xl md:text-2xl font-bold font-heading leading-relaxed">
          {question.question}
        </h2>

        <div className="mt-7 space-y-3">
          {question.options.map((option, index) => {
            const letter = String.fromCharCode(65 + index);
            const selected = selectedAnswer === option;

            return (
              <button
                key={option}
                type="button"
                onClick={() => selectAnswer(option)}
                className={`w-full rounded-xl border p-4 text-left transition-all ${
                  selected
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border"
                    }`}
                  >
                    {letter}
                  </span>

                  <span>{option}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            disabled={currentQuestion === 0}
            onClick={() =>
              setCurrentQuestion((previous) => previous - 1)
            }
          >
            <ChevronLeft className="size-4" />
            Previous
          </Button>

          {currentQuestion === questions.length - 1 ? (
            <Button
              onClick={() => setSubmitted(true)}
              disabled={Object.keys(answers).length === 0}
            >
              Submit Quiz
            </Button>
          ) : (
            <Button
              onClick={() =>
                setCurrentQuestion((previous) => previous + 1)
              }
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}