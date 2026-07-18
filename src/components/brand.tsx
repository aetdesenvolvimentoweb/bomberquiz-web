import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"

export function Brand({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn("font-bold transition-opacity hover:opacity-80", className)}
    >
      <span className="text-foreground">Bomber</span>
      <span className="text-ember">Quiz</span>
    </Link>
  )
}
