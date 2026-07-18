import { Link } from "react-router-dom"

export function Brand({ className }: { className?: string }) {
  return (
    <Link to="/" className={className}>
      BomberQuiz
    </Link>
  )
}
