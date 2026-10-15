import privacyMarkdown from "@/content/legal/privacidade-v2.md?raw"
import { LegalDocument } from "./legal-document"

export function PrivacyPage() {
  return <LegalDocument markdown={privacyMarkdown} />
}
