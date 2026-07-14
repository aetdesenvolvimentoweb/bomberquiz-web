import * as React from "react"
import { Input } from "@/components/ui/input"
import { extractDigits, formatPhoneDisplay } from "@/lib/phone"

export interface PhoneInputProps {
  value: string
  onChange: (digits: string) => void
  onBlur?: () => void
  name?: string
  placeholder?: string
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, ...props }, ref) => (
    <Input
      ref={ref}
      inputMode="tel"
      value={formatPhoneDisplay(value ?? "")}
      onChange={(e) => onChange(extractDigits(e.target.value).slice(0, 11))}
      {...props}
    />
  ),
)
PhoneInput.displayName = "PhoneInput"
