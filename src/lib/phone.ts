// Espelha api/src/infra/phone/regex-phone-validator.adapter.ts (repositórios independentes,
// sem pacote compartilhado — ver ADR-0008). Se a lista de DDDs ou as regras mudarem lá,
// replicar aqui também.
const VALID_DDDS = new Set([
  "11", "12", "13", "14", "15", "16", "17", "18", "19",
  "21", "22", "24", "27", "28",
  "31", "32", "33", "34", "35", "37", "38",
  "41", "42", "43", "44", "45", "46", "47", "48", "49",
  "51", "53", "54", "55",
  "61", "62", "63", "64", "65", "66", "67", "68", "69",
  "71", "73", "74", "75", "77", "79",
  "81", "82", "83", "84", "85", "86", "87", "88", "89",
  "91", "92", "93", "94", "95", "96", "97", "98", "99",
])

export type PhoneType = "mobile" | "landline"

export type PhoneValidationResult =
  | { valid: true; type: PhoneType }
  | { valid: false; reason: string }

export function validateBrazilianPhone(rawPhone: string): PhoneValidationResult {
  if (!/^\d{10,11}$/.test(rawPhone)) {
    return { valid: false, reason: "Telefone deve ter 10 ou 11 dígitos (DDD + número)" }
  }

  const ddd = rawPhone.slice(0, 2)
  if (!VALID_DDDS.has(ddd)) {
    return { valid: false, reason: "DDD inválido" }
  }

  const firstSubscriberDigit = rawPhone[2]

  if (rawPhone.length === 11) {
    if (firstSubscriberDigit !== "9") {
      return { valid: false, reason: "Número de celular deve começar com 9 após o DDD" }
    }
    return { valid: true, type: "mobile" }
  }

  if (!["2", "3", "4", "5"].includes(firstSubscriberDigit)) {
    return { valid: false, reason: "Número fixo inválido" }
  }
  return { valid: true, type: "landline" }
}

export function extractDigits(value: string): string {
  return value.replace(/\D/g, "")
}

export function formatPhoneDisplay(digits: string): string {
  const d = digits.slice(0, 11)
  if (d.length === 0) return ""
  if (d.length <= 2) return `(${d}`

  const ddd = d.slice(0, 2)
  const rest = d.slice(2)
  const subscriberLen = rest[0] === "9" ? 5 : 4

  if (rest.length <= subscriberLen) return `(${ddd}) ${rest}`
  return `(${ddd}) ${rest.slice(0, subscriberLen)}-${rest.slice(subscriberLen)}`
}
