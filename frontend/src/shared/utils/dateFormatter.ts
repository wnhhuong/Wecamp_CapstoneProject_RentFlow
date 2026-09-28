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

const shortDateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const shortMonthYearFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  month: 'short',
  year: 'numeric',
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

/**
 * Table columns only, where the long month costs more width than it earns;
 * detail sheets keep the full name. en-GB abbreviates September to "Sept", so
 * the month part is cut to three letters.
 */
function fromShortParts(parts: Intl.DateTimeFormatPart[]): string {
  return parts
    .map((part) => (part.type === 'month' ? part.value.slice(0, 3) : part.value))
    .join('')
}

// "18 Sep 2024".
export function formatDateShort(value: string | Date): string {
  const date = parseDate(value)
  if (Number.isNaN(date.getTime())) return '—'

  return fromShortParts(shortDateFormatter.formatToParts(date))
}

// "Sep 2026".
export function formatMonthYearShort(value: string | Date): string {
  const date = parseDate(value)
  if (Number.isNaN(date.getTime())) return '—'

  return fromShortParts(shortMonthYearFormatter.formatToParts(date))
}

/** Billing periods arrive as "2026-08"; render them as "Aug 2026". */
export function formatBillingPeriodShort(period: string): string {
  return /^\d{4}-\d{2}$/.test(period)
    ? formatMonthYearShort(`${period}-01`)
    : '—'
}

// Billing periods: "September 2026".
export function formatMonthYear(value: string | Date): string {
  const date = parseDate(value)
  if (Number.isNaN(date.getTime())) return '—'

  return monthYearFormatter.format(date)
}

/** Billing periods arrive as "2026-08"; render them as "August 2026". */
export function formatBillingPeriod(period: string): string {
  return /^\d{4}-\d{2}$/.test(period) ? formatMonthYear(`${period}-01`) : '—'
}

/**
 * Adds whole years to a YYYY-MM-DD calendar date, mirroring what approving an
 * extension does to the contract. Only ever a preview; nothing persists it.
 */
export function addYears(dateOnly: string, years: number): string {
  const parts = /^(\d{4})(-\d{2}-\d{2})$/.exec(dateOnly)
  if (!parts) return dateOnly

  return `${Number(parts[1]) + years}${parts[2]}`
}

/** Durations in whole years: "1 year", "2 years". */
export function formatYears(years: number): string {
  return `${years} year${years === 1 ? '' : 's'}`
}

// YYYY-MM-DD in UTC+7, for calendar-date comparisons.
export function getDateKey(value: string | Date = new Date()): string {
  const parts = dateKeyFormatter.formatToParts(parseDate(value))
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? ''

  return `${get('year')}-${get('month')}-${get('day')}`
}