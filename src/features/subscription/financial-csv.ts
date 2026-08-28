import type { AdminPayment } from "./financial-api"

/**
 * Monta o CSV das transações para levar ao contador (SUB-RF-012).
 *
 * Três decisões que só aparecem quando o arquivo é aberto de verdade:
 *
 * 1. **Separador `;` e decimal com vírgula.** É o que o Excel em português
 *    espera. Com `,` e ponto, o Excel pt-BR joga a linha inteira numa célula só
 *    e o arquivo fica ilegível — parece corrompido, mas é só a convenção errada.
 * 2. **BOM UTF-8 no começo.** Sem ele o Excel lê como Latin-1 e "João" vira
 *    "JoÃ£o" em toda a planilha.
 * 3. **Célula que começa com `=`, `+`, `-` ou `@` recebe um apóstrofo na
 *    frente.** Nome de cliente é texto que veio de fora; sem isso, um cadastro
 *    como `=1+1` seria avaliado como fórmula ao abrir a planilha (CSV injection).
 */
const SEPARADOR = ";"
const BOM = "﻿"

const COLUNAS = [
  "Data",
  "Cliente",
  "E-mail",
  "Plano",
  "Método",
  "Parcelas",
  "Status",
  "Cobrado",
  "Taxa MP",
  "Líquido",
  "ID Mercado Pago",
] as const

const STATUS_LABEL: Record<AdminPayment["status"], string> = {
  pending: "Pendente",
  paid: "Pago",
  failed: "Recusado",
  refunded: "Estornado",
}

const METODO_LABEL: Record<AdminPayment["method"], string> = {
  pix: "PIX",
  card: "Cartão",
  mp_balance: "Saldo MP",
}

export function buildPaymentsCsv(payments: AdminPayment[]): string {
  const linhas = payments.map((p) =>
    [
      formatarData(p.created_at),
      p.user_name,
      p.user_email,
      p.plan_name,
      METODO_LABEL[p.method],
      String(p.installments),
      STATUS_LABEL[p.status],
      centavosParaPlanilha(p.net_amount),
      // Vazio, não zero: a planilha precisa distinguir "sem taxa" de "ainda não
      // sabemos" tanto quanto a tela. Um zero aqui somaria como fato na conta
      // do contador.
      centavosParaPlanilha(p.fee_amount),
      centavosParaPlanilha(p.received_amount),
      p.mp_legacy_payment_id ?? "",
    ]
      .map(escapar)
      .join(SEPARADOR),
  )

  return BOM + [COLUNAS.join(SEPARADOR), ...linhas].join("\r\n")
}

/** Centavos → "34,90". `null` vira célula vazia, nunca 0. */
function centavosParaPlanilha(cents: number | null): string {
  if (cents === null) return ""
  return (cents / 100).toFixed(2).replace(".", ",")
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
}

function escapar(valor: string): string {
  // O apóstrofo tira o poder de fórmula sem sumir com o conteúdo: o Excel mostra
  // o texto original e o trata como texto.
  const neutro = /^[=+\-@]/.test(valor) ? `'${valor}` : valor
  if (neutro.includes(SEPARADOR) || neutro.includes('"') || neutro.includes("\n")) {
    return `"${neutro.replace(/"/g, '""')}"`
  }
  return neutro
}

/**
 * Entrega o arquivo ao navegador. Separado do `buildPaymentsCsv` para que a
 * montagem do conteúdo — a parte que erra em silêncio — seja testável sem DOM.
 */
export function downloadCsv(conteudo: string, nomeArquivo: string): void {
  const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = nomeArquivo
  link.click()
  URL.revokeObjectURL(url)
}
