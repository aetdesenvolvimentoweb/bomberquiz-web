import type { FieldValues, Path, UseFormReturn } from "react-hook-form"
import { ApiError } from "./errors"

/**
 * Aplica os erros de campo devolvidos pela API (ApiError.fields, com `field` no
 * formato snake_case das chaves do corpo JSON) como erros inline no formulário.
 * `fieldMap` traduz o nome do campo da API para o nome do campo do formulário
 * quando eles divergem (ex.: `new_password` -> `newPassword`); campos ausentes
 * do mapa são tentados com o próprio nome (útil quando já batem, ex.: `email`).
 *
 * Retorna `true` se pelo menos um erro foi aplicado, para o chamador decidir se
 * ainda precisa de um toast genérico ou se as mensagens inline já bastam.
 */
export function applyServerFieldErrors<TFieldValues extends FieldValues>(
  form: UseFormReturn<TFieldValues>,
  error: unknown,
  fieldMap: Partial<Record<string, Path<TFieldValues>>> = {},
): boolean {
  if (!(error instanceof ApiError) || !error.fields?.length) return false

  const knownFields = new Set(Object.keys(form.getValues()))
  let applied = false

  for (const field of error.fields) {
    const formField = fieldMap[field.field] ?? (field.field as Path<TFieldValues>)
    if (!knownFields.has(formField)) continue
    form.setError(formField, { type: "server", message: field.message })
    applied = true
  }

  return applied
}
