"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

import TextareaAutosize from "react-textarea-autosize"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
} from "@/components/ui/input-group"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/toast"
import { Send, LoaderCircle, Sparkles } from 'lucide-react'
import { QUICK_VIDEO_SUGGESTIONS } from '@/data/constant'
function Hero() {
    const items = [
  { label: "Full Course", value: "full-course" },
  { label: "Quick explain video", value: "quick-explain-video" },
]
  const router = useRouter()
  const [userInput, setUserInput] = useState("")
  const [courseType, setCourseType] = useState("full-course")
  const [loading, setLoading] = useState(false)

  const onGenerate = async () => {
    if (!userInput.trim()) {
      toast.add({ title: "Please enter a topic to generate a course.", type: "warning" })
      return
    }
    setLoading(true)
    const request = axios.post('/api/generate-course', {
      topic: userInput,
      courseType,
    })

    toast.promise(request, {
      loading: "Generating your course...",
      success: "Course generated successfully!",
      error: (err) =>
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "Something went wrong while generating the course.",
    }).catch(() => {})

    try {
      const result = await request
      router.push(`/course/${result.data.course.id}`)
    } catch {
      // handled by toast.promise above
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="relative flex flex-col items-center mt-24 px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-105 w-180 rounded-full blur-3xl"
        style={{ background: "var(--primary-glow)" }}
      />

      <Badge variant="secondary" className="relative mb-5 gap-1.5 px-3 py-1 text-xs font-medium">
        <Sparkles className="size-3 text-primary" />
        AI-Powered Course Generation
      </Badge>

      <div className="relative text-center max-w-2xl">
        <h2 className="text-4xl md:text-5xl font-bold font-heading tracking-tight bg-linear-to-b from-foreground to-foreground/70 bg-clip-text text-transparent text-balance">
          Learn Smarter with AI
        </h2>
        <p className="text-lg text-muted-foreground mt-3">Turn any topic into a structured course, instantly.</p>
      </div>

      <div className="relative grid w-full max-w-xl gap-6 mt-8">
      <InputGroup className="rounded-3xl border-border/80 bg-card shadow-lg shadow-black/40 transition-all">
        <TextareaAutosize
          data-slot="input-group-control"
          className="flex field-sizing-content min-h-26 w-full resize-none rounded-md bg-transparent px-3 py-2.5 text-base transition-[color,box-shadow] outline-none md:text-sm rounded-2xl"
          placeholder="Enter description of the topic..."
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
        />
        <InputGroupAddon align="block-end">
        <Select value={courseType} onValueChange={(value) => setCourseType(value ?? "full-course")}>
      <SelectTrigger className="w-full max-w-48">
        <SelectValue placeholder="Select course type" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Course Type</SelectLabel>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
          <InputGroupButton
            className="ml-auto rounded-full"
            size="sm"
            variant="default"
            disabled={loading}
            onClick={onGenerate}
          >
            {loading ? <LoaderCircle className="icon-sm animate-spin" /> : <Send className="icon-sm" />}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
    <div className="relative flex flex-wrap justify-center gap-2 max-w-xl mt-6">
        {QUICK_VIDEO_SUGGESTIONS.map((suggestion) => (
          <Badge
            key={suggestion.id}
            variant="outline"
            className="cursor-pointer px-3 py-1.5 border-border/80 hover:border-primary/60 hover:bg-primary/10 hover:text-foreground transition-colors"
            onClick={() => setUserInput(suggestion.prompt)}
          >
            {suggestion.title}
          </Badge>
        ))}
    </div>
    </div>
  )
}

export default Hero
