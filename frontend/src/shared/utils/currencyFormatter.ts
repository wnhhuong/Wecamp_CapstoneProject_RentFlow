/**
 * One place for money formatting so amounts read the same everywhere.
 *
 * "." groups thousands and the ₫ sign leads the amount. Form fields drop the
 * sign and keep the grouping, because their label already says VND.
 */
const CURRENCY_LOCALE = 'vi-VN'

const CURRENCY_SYMBOL = '₫'

const amountFormatter = new Intl.NumberFormat(CURRENCY_LOCALE, {
  maximumFractionDigits: 0,
})

/** 3200000 -> "₫ 3.200.000". Use for anything the user only reads. */
export function formatCurrency(value: number): string {
  return `${CURRENCY_SYMBOL} ${amountFormatter.format(value)}`
}

/** 3200000 -> "3.200.000". Use inside form fields labelled VND. */
export function formatAmount(value: number): string {
  return amountFormatter.format(value)
}

/** Keeps only the digits a user typed: "3.200.000 ₫" -> "3200000". */
export function toAmountDigits(input: string): string {
  return input.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
}

/** Groups digits as they are typed: "3200000" -> "3.200.000", "" -> "". */
export function formatAmountInput(input: string): string {
  const digits = toAmountDigits(input)

  return digits ? formatAmount(Number(digits)) : ''
}
