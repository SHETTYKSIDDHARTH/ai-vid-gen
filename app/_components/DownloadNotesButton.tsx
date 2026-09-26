import { buttonVariants } from "@/components/ui/button"
import { Download } from "lucide-react"
import { cn } from "@/lib/utils"

function DownloadNotesButton({
  courseId,
  iconOnly = false,
  className,
}: {
  courseId: number
  iconOnly?: boolean
  className?: string
}) {
  return (
    <a
      href={`/api/courses/${courseId}/notes`}
      download
      aria-label="Download course notes"
      className={cn(buttonVariants({ variant: "outline", size: iconOnly ? "icon" : "sm" }), className)}
    >
      <Download className="icon-sm" />
      {!iconOnly && "Download Notes"}
    </a>
  )
}

export default DownloadNotesButton
