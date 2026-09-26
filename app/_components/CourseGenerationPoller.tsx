"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

function CourseGenerationPoller({ isGenerating }: { isGenerating: boolean }) {
  const router = useRouter()

  useEffect(() => {
    if (!isGenerating) return
    const interval = setInterval(() => router.refresh(), 4000)
    return () => clearInterval(interval)
  }, [isGenerating, router])

  return null
}

export default CourseGenerationPoller
