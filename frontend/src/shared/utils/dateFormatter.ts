const TIME_ZONE = 'Asia/Ho_Chi_Minh'
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const monthYearFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  month: 'long',
  year: 'numeric',
})

const dateKeyFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function isDateOnly(value: string | Date): value is string {
  return typeof value === 'string' && DATE_ONLY_PATTERN.test(value)
}

function parseDate(value: string | Date): Date {
  // A calendar date stays on the same day in Vietnam.
  if (isDateOnly(value)) {
    return new Date(`${value}T00:00:00+07:00`)
  }

  // API timestamps must include Z or an explicit UTC offset.
  return value instanceof Date ? value : new Date(value)
}

export function formatDate(
  value: string | Date,
  withTime = false,
): string {
  const date = parseDate(value)
  if (Number.isNaN(date.getTime())) return '—'

  const formatter =
    withTime && !isDateOnly(value) ? dateTimeFormatter : dateFormatter

  return formatter.format(date)
}

// Billing periods: "September 2026".
export function formatMonthYear(value: string | Date): string {
  const date = parseDate(value)
  if (Number.isNaN(date.getTime())) return '—'

  return monthYearFormatter.format(date)
}

// YYYY-MM-DD in UTC+7, for calendar-date comparisons.
export function getDateKey(value: string | Date = new Date()): string {
  const parts = dateKeyFormatter.formatToParts(parseDate(value))
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? ''

  return `${get('year')}-${get('month')}-${get('day')}`
}