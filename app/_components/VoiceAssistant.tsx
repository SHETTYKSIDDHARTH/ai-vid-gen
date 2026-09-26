"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { Mic, MicOff, LoaderCircle } from "lucide-react"
import { cn } from "@/lib/utils"

type AssistantStatus = "idle" | "listening" | "processing"

type VoiceIntent = {
  action: string
  target?: string
  topic?: string
  courseType?: string
  chapterNumber?: number
  operation?: "play" | "retry" | "read"
  question?: string
}

type ChapterSummary = {
  id: number
  chapterOrder: number
  title: string
  subContent: string[] | null
  script: string | null
  videoStatus: string
}

function speak(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve()
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.onend = () => resolve()
    utterance.onerror = () => resolve()
    window.speechSynthesis.speak(utterance)
  })
}

function playChime(variant: "start" | "confirm" = "start") {
  if (typeof window === "undefined" || !window.AudioContext) return
  const ctx = new AudioContext()
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = "sine"
  oscillator.frequency.value = variant === "confirm" ? 660 : 880
  gain.gain.setValueAtTime(0.15, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start()
  oscillator.stop(ctx.currentTime + 0.3)
  oscillator.onended = () => ctx.close()
}

function speechErrorMessage(error: string): string {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access is blocked. Please allow microphone permissions and try again."
    case "audio-capture":
      return "I couldn't access your microphone."
    case "no-speech":
      return "I didn't hear anything."
    case "network":
      return "There was a network problem with voice recognition."
    default:
      return "Something went wrong while listening."
  }
}

function getRecognitionConstructor(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

function VoiceAssistant() {
  const router = useRouter()
  const pathname = usePathname()
  const [status, setStatus] = useState<AssistantStatus>("idle")
  const [transcript, setTranscript] = useState("")
  const [supported, setSupported] = useState(true)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const pendingDeleteCourseId = useRef<string | null>(null)
  const pathnameRef = useRef(pathname)
  const transcriptRef = useRef("")
  const statusRef = useRef<AssistantStatus>("idle")

  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  useEffect(() => {
    const Recognition = getRecognitionConstructor()
    setSupported(!!Recognition)
  }, [])

  const updateStatus = useCallback((next: AssistantStatus) => {
    statusRef.current = next
    setStatus(next)
  }, [])

  const startListening = useCallback((isFollowUp = false) => {
    const Recognition = getRecognitionConstructor()
    if (!Recognition) {
      if (!isFollowUp) {
        toast.add({
          title: "Voice commands aren't supported in this browser.",
          description: "Try Chrome or Edge.",
          type: "warning",
        })
      }
      return
    }

    if (statusRef.current !== "idle") return

    const recognition = new Recognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = "en-US"

    let errorMessage: string | null = null

    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1]
      const rawTranscript = result?.[0]?.transcript?.trim()
      if (rawTranscript) {
        transcriptRef.current = rawTranscript
        setTranscript(rawTranscript)
      }
    }

    recognition.onerror = (event) => {
      // "aborted" fires when we deliberately stop a session mid-flight — onend
      // handles the wrap-up message for that case, so don't double-announce here.
      if (event.error === "aborted") return
      errorMessage = speechErrorMessage(event.error)
    }

    recognition.onend = () => {
      recognitionRef.current = null
      const finalTranscript = transcriptRef.current
      if (finalTranscript) {
        playChime("confirm")
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        handleCommand(finalTranscript)
        return
      }

      updateStatus("idle")
      if (errorMessage) {
        speak(errorMessage)
      } else if (isFollowUp) {
        speak("Okay, standing by.")
      } else {
        speak("I didn't catch anything. Press the mic and try again.")
      }
    }

    recognitionRef.current = recognition
    transcriptRef.current = ""
    setTranscript("")
    updateStatus("listening")
    playChime()
    recognition.start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateStatus])

  const handleConfirmation = useCallback(
    (heard: string) => {
      const courseId = pendingDeleteCourseId.current
      pendingDeleteCourseId.current = null
      if (!courseId) return

      const lower = heard.toLowerCase()
      if (/\b(yes|confirm|delete)\b/.test(lower)) {
        speak("Deleting the course now.")
        const request = axios.delete(`/api/courses/${courseId}`)
        toast
          .promise(request, {
            loading: "Deleting course...",
            success: "Course deleted",
            error: "Something went wrong while deleting the course.",
          })
          .catch(() => {})
        request.then(() => router.push("/")).catch(() => {})
      } else {
        speak("Okay, cancelled.")
      }
    },
    [router]
  )

  const handleChapterAction = useCallback(async (intent: VoiceIntent) => {
    const match = pathnameRef.current.match(/\/course\/(\d+)/)
    if (!match) {
      await speak("You need to be viewing a course to control its chapters.")
      return
    }
    if (!intent.chapterNumber) {
      await speak("Which chapter did you mean?")
      return
    }

    let chapters: ChapterSummary[]
    try {
      const { data } = await axios.get(`/api/courses/${match[1]}/chapters`)
      chapters = data.chapters
    } catch {
      await speak("I couldn't load this course's chapters.")
      return
    }

    const chapter = chapters.find((c) => c.chapterOrder + 1 === intent.chapterNumber)
    if (!chapter) {
      await speak(`I couldn't find chapter ${intent.chapterNumber}.`)
      return
    }

    const cardEl = document.querySelector<HTMLElement>(`[data-chapter-id="${chapter.id}"]`)
    cardEl?.scrollIntoView({ behavior: "smooth", block: "center" })

    if (intent.operation === "retry") {
      const retryButton = cardEl?.querySelector<HTMLButtonElement>("[data-retry-chapter-video]")
      if (chapter.videoStatus === "failed" && retryButton) {
        await speak(`Retrying chapter ${intent.chapterNumber}.`)
        retryButton.click()
      } else {
        await speak(`Chapter ${intent.chapterNumber} isn't in a failed state, so there's nothing to retry.`)
      }
      return
    }

    if (intent.operation === "read") {
      const body = chapter.script || [chapter.title, ...(chapter.subContent ?? [])].join(". ")
      await speak(body || "This chapter has no content yet.")
      return
    }

    const video = cardEl?.querySelector("video")
    if (!video) {
      await speak(`Chapter ${intent.chapterNumber}'s video isn't ready yet.`)
      return
    }
    try {
      await video.play()
      await speak(`Playing chapter ${intent.chapterNumber}.`)
    } catch {
      await speak(`I couldn't autoplay chapter ${intent.chapterNumber}. Please press play manually.`)
    }
  }, [])

  const handleCommand = useCallback(
    async (heard: string) => {
      if (pendingDeleteCourseId.current) {
        updateStatus("processing")
        handleConfirmation(heard)
        updateStatus("idle")
        return
      }

      updateStatus("processing")
      let offerMore = true

      try {
        const { data } = await axios.post("/api/voice-command", { transcript: heard })
        const intent = data.intent as VoiceIntent

        switch (intent.action) {
          case "navigate": {
            const path =
              intent.target === "my-courses" ? "/?tab=my-courses" : intent.target === "generate" ? "/?tab=generate" : "/"
            speak(`Navigating to ${intent.target ?? "home"}.`)
            router.push(path)
            break
          }
          case "generate_course": {
            if (!intent.topic) {
              speak("I didn't catch the topic. Please try again.")
              break
            }
            speak(`Generating a course about ${intent.topic}. This may take a moment.`)
            const request = axios.post("/api/generate-course", {
              topic: intent.topic,
              courseType: intent.courseType ?? "full-course",
            })
            toast
              .promise(request, {
                loading: "Generating your course...",
                success: "Course generated successfully!",
                error: (err) =>
                  axios.isAxiosError(err) && err.response?.data?.message
                    ? err.response.data.message
                    : "Something went wrong while generating the course.",
              })
              .catch(() => {})
            const result = await request
            router.push(`/course/${result.data.course.id}`)
            speak("Your course is ready.")
            break
          }
          case "delete_course": {
            const match = pathnameRef.current.match(/\/course\/(\d+)/)
            if (!match) {
              speak("You need to be viewing a course to delete it.")
              break
            }
            pendingDeleteCourseId.current = match[1]
            speak("Are you sure you want to delete this course? Press the mic and say yes to confirm, or cancel.")
            offerMore = false
            break
          }
          case "read_page": {
            const text = document.querySelector("main")?.textContent?.trim()
            speak(text ? text : "There's nothing on this page to read.")
            break
          }
          case "download_notes": {
            const match = pathnameRef.current.match(/\/course\/(\d+)/)
            if (!match) {
              speak("You need to be viewing a course to download its notes.")
              break
            }
            speak("Downloading the notes now.")
            window.location.href = `/api/courses/${match[1]}/notes`
            break
          }
          case "chapter_action": {
            await handleChapterAction(intent)
            break
          }
          case "ask_question": {
            if (!intent.question) {
              speak("I didn't catch the question.")
              break
            }
            try {
              const { data: answerData } = await axios.post("/api/voice-answer", { question: intent.question })
              await speak(answerData.answer)
            } catch {
              speak("Sorry, I couldn't get an answer to that.")
            }
            break
          }
          case "stop_listening": {
            speak("Okay.")
            offerMore = false
            break
          }
          default:
            speak("Sorry, I didn't understand that command.")
        }
      } catch {
        speak("Something went wrong with that command.")
      }

      updateStatus("idle")

      if (offerMore) {
        await speak("Anything else?")
        startListening(true)
      }
    },
    [router, handleConfirmation, handleChapterAction, updateStatus, startListening]
  )

  const stopListening = () => {
    recognitionRef.current?.stop()
  }

  const toggle = useCallback(() => {
    if (statusRef.current === "listening") {
      stopListening()
    } else if (statusRef.current === "idle") {
      startListening(false)
    }
  }, [startListening])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Single dedicated key (no modifier chord) so the shortcut stays reachable
      // for people who can't reliably hold two keys down at once.
      if (event.key.toLowerCase() !== "m") return
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      const target = event.target as HTMLElement | null
      if (target && (["INPUT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable)) return
      event.preventDefault()
      toggle()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [toggle])

  return (
    <>
      <Button
        size="icon"
        onClick={toggle}
        disabled={!supported}
        title={
          !supported
            ? "Voice commands need Chrome or Edge"
            : status === "listening"
              ? "Stop voice command (M)"
              : "Voice command — press M or click, then speak"
        }
        aria-label={
          !supported
            ? "Voice commands aren't supported in this browser"
            : status === "listening"
              ? "Stop voice command"
              : "Start voice command. Press M, or click, then speak your command."
        }
        className={cn(
          "fixed bottom-6 left-1/2 -translate-x-1/2 z-100 size-20 rounded-full border-2 shadow-lg shadow-black/40 transition-colors",
          status === "idle" && "bg-primary/15 border-primary/50 text-primary hover:bg-primary/25",
          status === "listening" && "bg-primary border-primary text-primary-foreground",
          status === "processing" && "bg-primary/80 border-primary text-primary-foreground"
        )}
      >
        {status === "listening" ? (
          <Mic className="size-8" />
        ) : status === "processing" ? (
          <LoaderCircle className="size-8 animate-spin" />
        ) : (
          <MicOff className="size-8" />
        )}
      </Button>

      {status !== "idle" && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-32 left-1/2 -translate-x-1/2 z-100 flex items-center gap-3 rounded-full border border-primary/30 bg-popover/95 backdrop-blur-md px-5 py-3 shadow-lg shadow-black/50 max-w-md"
        >
          <span className="relative flex items-center justify-center size-8 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40" />
            <span className="relative flex items-center justify-center size-8 rounded-full bg-primary/20">
              {status === "processing" ? (
                <LoaderCircle className="size-4 text-primary animate-spin" />
              ) : (
                <Mic className="size-4 text-primary" />
              )}
            </span>
          </span>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium">
              {status === "listening" && "Listening... speak your command"}
              {status === "processing" && "Working on it..."}
            </span>
            {transcript && status === "listening" && (
              <span className="text-xs text-muted-foreground truncate">Heard: {transcript}</span>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default VoiceAssistant
