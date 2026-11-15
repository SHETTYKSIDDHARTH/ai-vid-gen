"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { LoaderCircle, RotateCcw, Clapperboard } from "lucide-react"
import type { ISLWordSegment } from "@/lib/sign-language/types"

const SignLanguagePanel = dynamic(
  () => import("./sign-language/SignLanguagePanel"),
  { ssr: false }
)

function ChapterMedia({
  chapterId,
  videoUrl,
  videoStatus,
  islVideoUrl,
  islVideoStatus,
  wordSegments,
}: {
  chapterId: number
  videoUrl: string | null
  videoStatus: string
  islVideoUrl?: string | null
  islVideoStatus?: string | null
  wordSegments?: string | null
}) {
  const router = useRouter()
  const [retrying, setRetrying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const onRetry = async () => {
    setRetrying(true)
    const request = axios.post(`/api/chapters/${chapterId}/generate-media`)
    toast.promise(request, {
      loading: "Retrying video generation...",
      success: "Video ready!",
      error: (err) =>
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "Something went wrong while generating the video.",
    }).catch(() => {})
    try {
      await request
      router.refresh()
    } catch {
      // handled by toast.promise above
    } finally {
      setRetrying(false)
    }
  }

  const onRetryISL = async () => {
    setRetrying(true)
    const request = axios.post(`/api/chapters/${chapterId}/generate-isl`)
    toast.promise(request, {
      loading: "Retrying ISL video generation...",
      success: "ISL video ready!",
      error: (err) =>
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "Something went wrong while generating the ISL video.",
    }).catch(() => {})
    try {
      await request
      router.refresh()
    } catch {
      // handled by toast.promise above
    } finally {
      setRetrying(false)
    }
  }

  // ── ISL Mode: side-by-side layout ───────────────────────────────────────
  if (islVideoUrl && islVideoStatus === "ready") {
    const segments: ISLWordSegment[] = wordSegments
      ? (JSON.parse(wordSegments) as ISLWordSegment[])
      : []

    return (
      <div className="mt-2 w-full">
        {/* ISL badge */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25">
            🤟 ISL Mode
          </span>
        </div>

        {/* Side-by-side */}
        <div className="flex flex-col sm:flex-row gap-3 items-start">
          {/* Video — full width on mobile, 65% on desktop */}
          <div className="w-full sm:flex-[65]">
            <video
              ref={videoRef}
              controls
              src={islVideoUrl}
              className="w-full rounded-lg"
            />
          </div>

          {/* Avatar panel — full width on mobile, 35% on desktop */}
          <div className="w-full sm:flex-[35] flex justify-center">
            <SignLanguagePanel videoRef={videoRef} wordSegments={segments} />
          </div>
        </div>
      </div>
    )
  }

  // ISL mode pending / processing
  if (islVideoStatus === "pending" || islVideoStatus === "processing") {
    return (
      <div className="relative mt-2 aspect-video w-full rounded-lg overflow-hidden ring-2 ring-violet-500/40 shadow-lg shadow-violet-900/20">
        <div className="absolute inset-0 shimmer" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/10">
          <span className="relative flex items-center justify-center size-14 rounded-full bg-violet-500/15 border-2 border-violet-500/40">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-500/30" />
            <span className="relative text-2xl">🤟</span>
          </span>
          <span className="text-sm font-semibold text-foreground">
            {islVideoStatus === "processing"
              ? "Generating ISL video..."
              : "Preparing ISL video..."}
          </span>
          <span className="text-xs text-muted-foreground">
            ISL videos take a bit longer — hang tight!
          </span>
        </div>
      </div>
    )
  }

  // ISL failed
  if (islVideoStatus === "failed") {
    return (
      <div className="flex items-center gap-2 mt-2">
        <p className="text-sm text-destructive">ISL video generation failed.</p>
        <Button variant="outline" size="sm" disabled={retrying} onClick={onRetryISL}>
          {retrying ? <LoaderCircle className="icon-sm animate-spin" /> : <RotateCcw className="icon-sm" />}
          Retry
        </Button>
      </div>
    )
  }

  // ── Regular Mode ────────────────────────────────────────────────────────
  if (videoStatus === "ready" && videoUrl) {
    return <video controls src={videoUrl} className="w-full rounded-lg mt-2" />
  }

  if (videoStatus === "failed") {
    return (
      <div className="flex items-center gap-2 mt-2">
        <p className="text-sm text-destructive">Video generation failed.</p>
        <Button variant="outline" size="sm" disabled={retrying} onClick={onRetry} data-retry-chapter-video>
          {retrying ? <LoaderCircle className="icon-sm animate-spin" /> : <RotateCcw className="icon-sm" />}
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="relative mt-2 aspect-video w-full rounded-lg overflow-hidden shimmer ring-2 ring-primary/50 shadow-lg shadow-primary/20">
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/10">
        <span className="relative flex items-center justify-center size-14 rounded-full bg-primary/15 border-2 border-primary/40">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/30" />
          <Clapperboard className="relative size-6 text-primary" />
        </span>
        <span className="text-sm font-semibold text-foreground">
          {videoStatus === "processing" ? "Generating video..." : "Preparing video..."}
        </span>
        <span className="text-xs text-muted-foreground">This can take a minute or two</span>
      </div>
    </div>
  )
}

export default ChapterMedia
