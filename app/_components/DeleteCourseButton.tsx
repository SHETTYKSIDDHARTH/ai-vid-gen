"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { Trash2 } from "lucide-react"

function DeleteCourseButton({
  courseId,
  courseTitle,
  redirectAfterDelete,
  className,
}: {
  courseId: number
  courseTitle: string | null
  redirectAfterDelete?: string
  className?: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const onDelete = async () => {
    setLoading(true)
    const request = axios.delete(`/api/courses/${courseId}`)
    toast.promise(request, {
      loading: "Deleting course...",
      success: "Course deleted",
      error: (err) =>
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "Something went wrong while deleting the course.",
    }).catch(() => {})
    try {
      await request
      if (redirectAfterDelete) {
        router.push(redirectAfterDelete)
      } else {
        router.refresh()
      }
    } catch {
      // handled by toast.promise above
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="ghost" size="icon" className={className} disabled={loading}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this course?</AlertDialogTitle>
          <AlertDialogDescription>
            {courseTitle ? `"${courseTitle}"` : "This course"} and all its generated chapters, audio,
            and video will be permanently removed. This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default DeleteCourseButton
