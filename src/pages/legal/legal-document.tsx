import type { ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { Link } from "react-router-dom";
import remarkGfm from "remark-gfm";

// Links internos (/privacidade, /termos) navegam pelo router; e-mail abre o
// programa de e-mail; os demais abrem em outra aba.
function MarkdownLink({ href = "", children }: { href?: string; children?: ReactNode }) {
  if (href.startsWith("/")) {
    return (
      <Link to={href} className="font-medium text-primary underline underline-offset-2">
        {children}
      </Link>
    )
  }
  const external = !href.startsWith("mailto:")
  return (
    <a
      href={href}
      {...(external && { target: "_blank", rel: "noreferrer" })}
      className="font-medium text-primary underline underline-offset-2"
    >
      {children}
    </a>
  )
}

const components: Components = {
  h1: ({ children }) => <h1 className="text-2xl font-semibold tracking-tight">{children}</h1>,
  h2: ({ children }) => <h2 className="pt-4 text-lg font-semibold">{children}</h2>,
  p: ({ children }) => <p className="leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="list-disc space-y-1.5 pl-5">{children}</ul>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  a: ({ href, children }) => <MarkdownLink href={href}>{children}</MarkdownLink>,
  // Se a tabela não couber, rola dentro da própria caixa, sem empurrar a página.
  table: ({ children }) => (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full border-collapse text-left text-xs sm:text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border-b bg-muted px-2 py-2 font-semibold sm:px-3">{children}</th>,
  td: ({ children }) => <td className="border-b px-2 py-2 align-top sm:px-3">{children}</td>,
}

/**
 * Termos e Política (AUTH-RF-011 CA-4). O texto vem de `src/content/legal/*.md`,
 * cópia de `requisitos/docs/legal/` — ao mudar um, mude o outro e suba
 * CONSENT_VERSION (web) e CONSENT_CURRENT_VERSION (API) se a mudança for relevante.
 */
export function LegalDocument({ markdown }: { markdown: string }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← BomberQuiz
      </Link>
      <article className="mt-6 space-y-4 text-justify text-sm text-foreground/90 sm:text-base">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {markdown}
        </ReactMarkdown>
      </article>
    </div>
  )
}
