import { useState } from "react"
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PhoneInput } from "@/components/phone-input"

function ControlledPhoneInput() {
  const [value, setValue] = useState("")
  return <PhoneInput value={value} onChange={setValue} placeholder="telefone" />
}

describe("PhoneInput", () => {
  it("exibe a máscara de celular conforme o usuário digita", async () => {
    render(<ControlledPhoneInput />)
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText("telefone"), "62999998888")

    expect(screen.getByPlaceholderText("telefone")).toHaveValue("(62) 99999-8888")
  })

  it("exibe a máscara de fixo conforme o usuário digita", async () => {
    render(<ControlledPhoneInput />)
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText("telefone"), "6233334444")

    expect(screen.getByPlaceholderText("telefone")).toHaveValue("(62) 3333-4444")
  })

  it("ignora caracteres não numéricos colados no campo", async () => {
    render(<ControlledPhoneInput />)
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText("telefone"), "abc62999998888")

    expect(screen.getByPlaceholderText("telefone")).toHaveValue("(62) 99999-8888")
  })
})
