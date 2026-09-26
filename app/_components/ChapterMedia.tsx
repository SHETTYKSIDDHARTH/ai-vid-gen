"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { LoaderCircle, RotateCcw, Clapperboard } from "lucide-react"

function ChapterMedia({
  chapterId,
  videoUrl,
  videoStatus,
}: {
  chapterId: number
  videoUrl: string | null
  videoStatus: string
}) {
  const router = useRouter()
  const [retrying, setRetrying] = useState(false)

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
