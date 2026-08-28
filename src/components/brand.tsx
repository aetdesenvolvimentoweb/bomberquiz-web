import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export function Brand({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn("font-bold transition-opacity hover:opacity-80", className)}
    >
      <span className="text-foreground text-2xl">Bomber</span>
      <span className="text-ember text-2xl">Quiz</span>
    </Link>
  );
}
