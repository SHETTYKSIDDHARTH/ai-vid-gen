"use client"

import React, { useState } from 'react'

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
import { Send } from 'lucide-react'
import { QUICK_VIDEO_SUGGESTIONS } from '@/data/constant'
function Hero() {
    const items = [
  { label: "Full Course", value: "full-course" },
  { label: "Quick explain video", value: "quick-explain-video" },
]
  const [userInput, setUserInput] = useState("")
  return (
    <div className="flex flex-col items-center mt-20">
      <div>
       <h2 className="text-3xl font-bold text-mono">Learn Smarter with AI</h2>
       <p className="text-lg flex flex-col items-center text-gray-500">Turn topic into course</p>
      </div>

      <div className="grid w-full max-w-xl gap-6 mt-5">
      <InputGroup>
        <TextareaAutosize
          data-slot="input-group-control"
          className="flex field-sizing-content min-h-26 w-full resize-none rounded-md bg-transparent px-3 py-2.5 text-base transition-[color,box-shadow] outline-none md:text-sm rounded-2xl"
          placeholder="Enter description of the topic..."
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
        />
        <InputGroupAddon align="block-end">
        <Select items={items}>
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
          <InputGroupButton className="ml-auto" size="sm" variant="default">
            <Send className="icon-sm" />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
    <div className="flex flex-wrap justify-center gap-2 max-w-xl mt-5">
        {QUICK_VIDEO_SUGGESTIONS.map((suggestion) => (
          <Badge
            key={suggestion.id}
            variant="outline"
            className="cursor-pointer px-3 py-1"
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
