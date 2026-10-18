
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Mic,
  MicOff,
  RotateCcw,
  Trophy,
  Volume2,
  VolumeX,
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

type SpeechRecognitionAlternative = {
  transcript: string;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<
    ArrayLike<SpeechRecognitionAlternative>
  >;
  resultIndex: number;
};

type RecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => RecognitionInstance;
  webkitSpeechRecognition?: new () => RecognitionInstance;
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

  // Voice mode is enabled by default.
  const [voiceMode, setVoiceMode] = useState(true);
  const [listening, setListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState("");

  const recognitionRef = useRef<RecognitionInstance | null>(null);
  const shouldListenRef = useRef(false);
  const voiceModeRef = useRef(true);
  const startedRef = useRef(false);
  const submittedRef = useRef(false);
  const currentQuestionRef = useRef(0);
  const questionsRef = useRef<MCQ[]>([]);
  const answersRef = useRef<Record<number, string>>({});
  const handleTranscriptRef = useRef<(transcript: string) => void>(
    () => {}
  );

  // Keep refs synchronized so voice callbacks always use current state.
  useEffect(() => {
    voiceModeRef.current = voiceMode;
    startedRef.current = started;
    submittedRef.current = submitted;
    currentQuestionRef.current = currentQuestion;
    questionsRef.current = questions;
    answersRef.current = answers;
  }, [
    voiceMode,
    started,
    submitted,
    currentQuestion,
    questions,
    answers,
  ]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;

    const recognition = recognitionRef.current;
    recognitionRef.current = null;

    if (recognition) {
      try {
        recognition.abort();
      } catch {
        // Recognition may already have stopped.
      }
    }

    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (
      !voiceModeRef.current ||
      !startedRef.current ||
      submittedRef.current
    ) {
      return;
    }

    const speechWindow = window as SpeechWindow;
    const Recognition =
      speechWindow.SpeechRecognition ??
      speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setVoiceMessage(
        "Voice recognition is not supported by this browser. " +
          "Use the answer buttons or keyboard instead."
      );
      setListening(false);
      return;
    }

    // Do not create multiple simultaneous recognition sessions.
    if (recognitionRef.current) {
      return;
    }

    const recognition = new Recognition();

    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const result = event.results[event.resultIndex];
      const transcript = result?.[0]?.transcript?.trim();

      if (transcript) {
        handleTranscriptRef.current(transcript);
      }
    };

    recognition.onerror = (event) => {
      setListening(false);

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        shouldListenRef.current = false;
        setVoiceMessage(
          "Microphone access was denied. Allow microphone access in your browser settings, or use the visual quiz."
        );
      } else if (event.error === "audio-capture") {
        shouldListenRef.current = false;
        setVoiceMessage(
          "No microphone was detected. Connect a microphone or use the visual quiz."
        );
      } else if (event.error === "language-not-supported") {
        shouldListenRef.current = false;
        setVoiceMessage(
          "English voice recognition is unavailable in this browser."
        );
      } else if (event.error === "network") {
        setVoiceMessage(
          "Voice recognition encountered a network issue. Try the microphone button again."
        );
      }
    };

    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }

      setListening(false);

      // Some browsers end recognition after a period of silence.
      // Do not restart automatically after an intentional stop.
      if (
        shouldListenRef.current &&
        voiceModeRef.current &&
        startedRef.current &&
        !submittedRef.current
      ) {
        shouldListenRef.current = false;
        setVoiceMessage(
          "Voice listening stopped. Select Start Listening to continue."
        );
      }
    };

    recognitionRef.current = recognition;
    shouldListenRef.current = true;

    try {
      recognition.start();
      setListening(true);
      setVoiceMessage(
        "Listening. Say A, B, C, D, or a quiz command."
      );
    } catch {
      recognitionRef.current = null;
      shouldListenRef.current = false;
      setListening(false);
      setVoiceMessage(
        "Could not start the microphone. Try again or use the visual quiz."
      );
    }
  }, []);

  const speakText = useCallback(
    (text: string, listenAfterSpeech = true) => {
      // Speech synthesis is provided by the browser.
      if (
        typeof window === "undefined" ||
        !("speechSynthesis" in window)
      ) {
        setVoiceMessage(
          "Audio instructions are not supported by this browser. Use the visual quiz."
        );
        return;
      }

      stopListening();
      window.speechSynthesis.cancel();

      if (!voiceModeRef.current) {
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      utterance.pitch = 1;

      utterance.onstart = () => {
        setVoiceMessage("Speaking...");
      };

      utterance.onend = () => {
        if (
          listenAfterSpeech &&
          voiceModeRef.current &&
          startedRef.current &&
          !submittedRef.current
        ) {
          startListening();
        } else if (!submittedRef.current) {
          setVoiceMessage("Audio instruction finished.");
        }
      };

      utterance.onerror = () => {
        setVoiceMessage(
          "Audio playback failed. You can continue using the visual quiz."
        );
      };

      window.speechSynthesis.speak(utterance);
    },
    [startListening, stopListening]
  );

  const speakQuestion = useCallback(
    (index: number) => {
      const question = questionsRef.current[index];

      if (!question) return;

      const optionsText = question.options
        .map((option, optionIndex) => {
          const letter = String.fromCharCode(65 + optionIndex);
          return `Option ${letter}. ${option}.`;
        })
        .join(" ");

      speakText(
        `Question ${index + 1} of ${questionsRef.current.length}. ` +
          `${question.question}. ${optionsText} ` +
          "Say A, B, C, or D to select an answer. " +
          "You can also say repeat question, next question, " +
          "previous question, or submit quiz.",
        true
      );
    },
    [speakText]
  );

  const selectAnswer = useCallback(
    (answer: string) => {
      if (submittedRef.current) return;

      const index = currentQuestionRef.current;

      setAnswers((previous) => {
        const next = { ...previous, [index]: answer };
        answersRef.current = next;
        return next;
      });
    },
    []
  );

  const goToQuestion = useCallback(
    (index: number) => {
      const currentQuestions = questionsRef.current;

      if (index < 0 || index >= currentQuestions.length) {
        speakText(
          index < 0
            ? "You are already at the first question."
            : "You are already at the last question.",
          true
        );
        return;
      }

      currentQuestionRef.current = index;
      setCurrentQuestion(index);

      if (voiceModeRef.current) {
        speakQuestion(index);
      }
    },
    [speakQuestion, speakText]
  );

  const submitQuiz = useCallback(() => {
    const currentQuestions = questionsRef.current;
    const currentAnswers = answersRef.current;

    if (currentQuestions.length === 0) return;

    const unanswered = currentQuestions.filter(
      (_, index) => !currentAnswers[index]
    ).length;

    if (unanswered > 0) {
      speakText(
        `You have ${unanswered} unanswered questions. ` +
          "Say next question or previous question to navigate, " +
          "or say submit quiz again to submit anyway.",
        true
      );

      // Keep submission available; the user may intentionally skip questions.
      setVoiceMessage(
        `${unanswered} question(s) are unanswered. Submit again if you want to finish now.`
      );

      return;
    }

    const totalCorrect = currentQuestions.reduce(
      (total, question, index) =>
        total + (currentAnswers[index] === question.answer ? 1 : 0),
      0
    );

    const percentage = Math.round(
      (totalCorrect / currentQuestions.length) * 100
    );

    submittedRef.current = true;
    stopListening();
    setSubmitted(true);

    speakText(
      `Quiz complete. You scored ${totalCorrect} out of ` +
        `${currentQuestions.length}. Your percentage is ${percentage} percent.`,
      false
    );
  }, [speakText, stopListening]);

  // Interpret spoken answers and commands.
  const handleTranscript = useCallback(
    (rawTranscript: string) => {
      const transcript = rawTranscript
        .toLowerCase()
        .replace(/[.,!?]/g, " ")
        .trim();

      if (!transcript) return;

      setVoiceMessage(`Heard: "${rawTranscript}"`);

      if (
        transcript.includes("repeat") ||
        transcript.includes("say the question") ||
        transcript.includes("read the question")
      ) {
        speakQuestion(currentQuestionRef.current);
        return;
      }

      if (
        transcript.includes("previous question") ||
        transcript === "previous" ||
        transcript === "go back" ||
        transcript === "back"
      ) {
        goToQuestion(currentQuestionRef.current - 1);
        return;
      }

      if (
        transcript.includes("next question") ||
        transcript === "next" ||
        transcript === "continue"
      ) {
        goToQuestion(currentQuestionRef.current + 1);
        return;
      }

      if (
        transcript.includes("submit quiz") ||
        transcript === "submit" ||
        transcript === "finish quiz"
      ) {
        submitQuiz();
        return;
      }

      if (
        transcript === "start listening" ||
        transcript === "listen"
      ) {
        startListening();
        return;
      }

      if (
        transcript === "stop listening" ||
        transcript === "stop microphone"
      ) {
        stopListening();
        setVoiceMessage("Voice listening stopped.");
        return;
      }

      const optionMatch = transcript.match(
        /(?:option|answer|choice|select)\s*(a|b|c|d|one|two|three|four|1|2|3|4)\b/
      );

      const standaloneMatch = transcript.match(
        /^(a|b|c|d|one|two|three|four|1|2|3|4)$/
      );

      const match = optionMatch ?? standaloneMatch;

      if (!match) {
        setVoiceMessage(
          `Heard "${rawTranscript}". Say option A, B, C, or D, or use a quiz command.`
        );
        return;
      }

      const spokenOption = match[1];

      const optionMap: Record<string, number> = {
        a: 0,
        one: 0,
        "1": 0,
        b: 1,
        two: 1,
        "2": 1,
        c: 2,
        three: 2,
        "3": 2,
        d: 3,
        four: 3,
        "4": 3,
      };

      const optionIndex = optionMap[spokenOption];
      const question =
        questionsRef.current[currentQuestionRef.current];

      if (!question || optionIndex >= question.options.length) {
        speakText(
          "That option is not available for this question. Please try again.",
          true
        );
        return;
      }

      const selectedOption = question.options[optionIndex];
      const letter = String.fromCharCode(65 + optionIndex);

      selectAnswer(selectedOption);

      speakText(
        `Option ${letter} selected. ${selectedOption}. ` +
          "Say another option to change your answer, or say next question to continue.",
        true
      );
    },
    [
      goToQuestion,
      selectAnswer,
      speakQuestion,
      speakText,
      startListening,
      stopListening,
      submitQuiz,
    ]
  );

  useEffect(() => {
    handleTranscriptRef.current = handleTranscript;
  }, [handleTranscript]);

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
        questionsRef.current = data.questions ?? [];
      } catch (error) {
        console.error(error);
        setError("Unable to load the quiz. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadQuiz();
  }, [courseId]);

  // Cancel speech and microphone activity when leaving the component.
  useEffect(() => {
    return () => {
      shouldListenRef.current = false;

      const recognition = recognitionRef.current;
      recognitionRef.current = null;

      if (recognition) {
        try {
          recognition.abort();
        } catch {
          // Ignore an already-stopped recognition session.
        }
      }

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const resetQuiz = () => {
    stopListening();

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    setAnswers({});
    answersRef.current = {};
    currentQuestionRef.current = 0;
    setCurrentQuestion(0);

    submittedRef.current = false;
    setSubmitted(false);

    startedRef.current = true;
    setStarted(true);

    if (voiceModeRef.current) {
      speakText(
        "Starting a new attempt with the same questions. " +
          "You can answer by saying A, B, C, or D.",
        false
      );

      // Read the first question after the short introduction.
      window.setTimeout(() => {
        if (voiceModeRef.current && startedRef.current) {
          speakQuestion(0);
        }
      }, 2200);
    }
  };

  const score = questions.reduce(
    (total, question, index) =>
      total + (answers[index] === question.answer ? 1 : 0),
    0
  );

  const toggleVoiceMode = () => {
    if (voiceMode) {
      // Update the ref immediately so speech callbacks cannot restart audio.
      voiceModeRef.current = false;
      setVoiceMode(false);
      stopListening();

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }

      setVoiceMessage("Voice Mode is off. Use the visual quiz controls.");
      return;
    }

    voiceModeRef.current = true;
    setVoiceMode(true);

    if (startedRef.current && !submittedRef.current) {
      speakText(
        "Voice Mode is on. Questions and options will be read aloud.",
        false
      );

      window.setTimeout(() => {
        if (voiceModeRef.current && startedRef.current) {
          speakQuestion(currentQuestionRef.current);
        }
      }, 1500);
    } else {
      setVoiceMessage(
        "Voice Mode is on. Audio will begin when you start the quiz."
      );
    }
  };

  if (loading) {
    return (
      <div
        role="status"
        className="rounded-2xl border bg-card p-8 text-center"
      >
        <p className="text-muted-foreground">
          Preparing your quiz...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <p role="alert" className="text-destructive">
          {error}
        </p>
        <Button
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>
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

  const voiceControls = (
    <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {voiceMode ? (
            <Headphones
              aria-hidden="true"
              className="size-5 text-primary"
            />
          ) : (
            <VolumeX
              aria-hidden="true"
              className="size-5 text-muted-foreground"
            />
          )}

          <div>
            <p className="font-semibold">
              Voice Mode: {voiceMode ? "On" : "Off"}
            </p>
            <p className="text-sm text-muted-foreground">
              {voiceMode
                ? "Listen to questions and answer by speaking."
                : "Use the visual quiz controls."}
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          aria-pressed={voiceMode}
          onClick={toggleVoiceMode}
        >
          {voiceMode ? (
            <>
              <VolumeX aria-hidden="true" className="size-4" />
              Turn Voice Off
            </>
          ) : (
            <>
              <Volume2 aria-hidden="true" className="size-4" />
              Turn Voice On
            </>
          )}
        </Button>
      </div>

      {voiceMode && started && !submitted && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => speakQuestion(currentQuestionRef.current)}
          >
            <Volume2 aria-hidden="true" className="size-4" />
            Repeat Question
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (listening) {
                stopListening();
                setVoiceMessage("Voice listening stopped.");
              } else {
                startListening();
              }
            }}
          >
            {listening ? (
              <>
                <MicOff aria-hidden="true" className="size-4" />
                Stop Listening
              </>
            ) : (
              <>
                <Mic aria-hidden="true" className="size-4" />
                Start Listening
              </>
            )}
          </Button>
        </div>
      )}

      {voiceMode && (
        <p
          role="status"
          aria-live="polite"
          className="text-sm text-muted-foreground"
        >
          {voiceMessage ||
            "Voice Mode is enabled. Start the quiz to hear audio instructions."}
        </p>
      )}
    </div>
  );

  if (!started) {
    return (
      <div className="rounded-2xl border bg-card p-6 md:p-10 space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-primary/10">
            <Trophy
              aria-hidden="true"
              className="size-7 text-primary"
            />
          </div>

          <h2 className="text-2xl font-bold font-heading">
            Quiz Simulation
          </h2>

          <p className="mt-2 text-muted-foreground">
            Test your understanding with {questions.length} multiple-choice
            questions from this course.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <span>{questions.length} Questions</span>
            <span>Multiple-choice answers</span>
            <span>Instant score</span>
          </div>
        </div>

        {voiceControls}

        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            When you start, your browser may ask for microphone permission.
            Choose Allow to answer questions by speaking.
          </p>

          <Button
            className="w-full sm:w-auto"
            onClick={() => {
              startedRef.current = true;
              setStarted(true);

              if (voiceModeRef.current) {
                speakText(
                  "Welcome to the quiz. Voice Mode is on. " +
                    "I will read each question and its options. " +
                    "Say A, B, C, or D to answer. " +
                    "You can say repeat question, next question, " +
                    "previous question, or submit quiz. " +
                    "Let's begin.",
                  false
                );

                window.setTimeout(() => {
                  if (
                    voiceModeRef.current &&
                    startedRef.current &&
                    !submittedRef.current
                  ) {
                    speakQuestion(0);
                  }
                }, 4500);
              }
            }}
          >
            {voiceMode ? (
              <Headphones aria-hidden="true" className="size-4" />
            ) : null}
            Start Quiz
          </Button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="space-y-6">
        {voiceControls}

        <div className="rounded-2xl border bg-card p-8 text-center">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-primary/10">
            <Trophy
              aria-hidden="true"
              className="size-7 text-primary"
            />
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
            <RotateCcw aria-hidden="true" className="size-4" />
            Retry Quiz
          </Button>
        </div>

        <h3 className="text-xl font-bold">Answer Review</h3>

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
                    <CheckCircle2
                      aria-hidden="true"
                      className="mt-0.5 size-5 shrink-0 text-green-600"
                    />
                  ) : (
                    <XCircle
                      aria-hidden="true"
                      className="mt-0.5 size-5 shrink-0 text-destructive"
                    />
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
      {voiceControls}

      <div className="rounded-2xl border bg-card p-6 md:p-8">
        <div className="mb-3 flex items-center justify-between gap-4">
          <span className="text-sm font-medium">
            Question {currentQuestion + 1} of {questions.length}
          </span>

          <span className="text-sm text-muted-foreground">
            {Math.round(progress)}%
          </span>
        </div>

        <div
          role="progressbar"
          aria-label="Quiz progress"
          aria-valuemin={0}
          aria-valuemax={questions.length}
          aria-valuenow={currentQuestion + 1}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-6 md:p-8">
        <h2
          id="quiz-question"
          className="text-xl font-bold leading-relaxed font-heading md:text-2xl"
        >
          Question {currentQuestion + 1}. {question.question}
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          {voiceMode
            ? "Speak your answer or select an option below."
            : "Select one answer."}
        </p>

        <fieldset className="mt-7 space-y-3">
          <legend className="sr-only">
            Answer options for question {currentQuestion + 1}
          </legend>

          {question.options.map((option, index) => {
            const letter = String.fromCharCode(65 + index);
            const selected = selectedAnswer === option;

            return (
              <button
                key={`${currentQuestion}-${index}`}
                type="button"
                aria-pressed={selected}
                aria-describedby="quiz-question"
                onClick={() => {
                  selectAnswer(option);

                  if (voiceModeRef.current) {
                    speakText(
                      `Option ${letter} selected. ${option}.`,
                      true
                    );
                  } else {
                    setVoiceMessage(`Option ${letter} selected.`);
                  }
                }}
                className={`w-full rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  selected
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={`flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border"
                    }`}
                  >
                    {letter}
                  </span>

                  <span>{option}</span>

                  {selected && (
                    <CheckCircle2
                      aria-hidden="true"
                      className="ml-auto size-5 shrink-0 text-primary"
                    />
                  )}
                </span>
              </button>
            );
          })}
        </fieldset>

        <p
          aria-live="polite"
          className="mt-4 text-sm text-muted-foreground"
        >
          {selectedAnswer
            ? `Selected answer: ${selectedAnswer}`
            : "No answer selected yet."}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={currentQuestion === 0}
            onClick={() => goToQuestion(currentQuestion - 1)}
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
            Previous
          </Button>

          {currentQuestion === questions.length - 1 ? (
            <Button
              type="button"
              onClick={submitQuiz}
            >
              Submit Quiz
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => goToQuestion(currentQuestion + 1)}
            >
              Next
              <ChevronRight aria-hidden="true" className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
