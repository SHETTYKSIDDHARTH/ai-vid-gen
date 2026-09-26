"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

function HomeTabs({ generateSlot, coursesSlot }: { generateSlot: React.ReactNode; coursesSlot: React.ReactNode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = searchParams.get("tab") === "my-courses" ? "courses" : "generate"

  const onValueChange = (value: string) => {
    router.push(value === "courses" ? "/?tab=my-courses" : "/?tab=generate")
  }

  return (
    <Tabs value={tab} onValueChange={onValueChange} className="w-full max-w-5xl mx-auto">
      <TabsList className="mx-auto mb-10">
        <TabsTrigger value="generate">Generate</TabsTrigger>
        <TabsTrigger value="courses">My Courses</TabsTrigger>
      </TabsList>
      <TabsContent value="generate">{generateSlot}</TabsContent>
      <TabsContent value="courses">{coursesSlot}</TabsContent>
    </Tabs>
  )
}

export default HomeTabs
