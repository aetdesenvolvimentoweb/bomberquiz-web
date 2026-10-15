import termsMarkdown from "@/content/legal/termos-v2.md?raw"
import { LegalDocument } from "./legal-document"

export function TermsPage() {
  return <LegalDocument markdown={termsMarkdown} />
}
