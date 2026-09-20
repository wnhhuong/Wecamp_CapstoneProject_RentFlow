export const DOB_PLACEHOLDER = 'DD/MM/YYYY'

/** Oldest birth year the calendar offers; also the lower bound for typing. */
export const EARLIEST_BIRTH_YEAR = 1900

/**
 * Keeps the slashes fixed while the tenant types: only digits are taken from
 * the keystroke and the separators are put back around them.
 */
export function maskDob(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)]

  return parts.filter((part) => part !== '').join('/')
}

function formatDobInput(day: number, month: number, year: number): string {
  return `${pad(day)}/${pad(month)}/${year}`
}

export function dobFromDate(date: Date): string {
  return formatDobInput(date.getDate(), date.getMonth() + 1, date.getFullYear())
}

/** The API stores a calendar date, so the parts are kept as written. */
export function dobToApiDate(value: string): string | null {
  const parsed = parseDob(value)
  if (!parsed) return null

  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`
}

export function parseDob(value: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!match) return null

  const [day, month, year] = match.slice(1).map(Number)
  if (year < EARLIEST_BIRTH_YEAR || month < 1 || month > 12 || day < 1) return null

  const date = new Date(year, month - 1, day)
  const isRealDate =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  if (!isRealDate || date > new Date()) return null

  return date
}

export interface ProfileForm {
  fullName: string
  dob: string
  phoneNumber: string
  identityNo: string
  sex: string
  nationality: string
  por: string
  password: string
  confirmPassword: string
}

export type ProfileField = keyof ProfileForm | 'confirmIn4'

/** Only fields the tenant got wrong appear here, so an empty map means valid. */
export function validateProfile(
  form: ProfileForm,
  confirmedInformation: boolean,
): Partial<Record<ProfileField, string>> {
  const problems: Partial<Record<ProfileField, string>> = {}

  if (form.fullName.trim() === '') problems.fullName = 'Enter your full name as it appears on your ID.'
  if (!parseDob(form.dob)) problems.dob = `Enter a real past date as ${DOB_PLACEHOLDER}.`
  if (!/^\d{10,11}$/.test(form.phoneNumber)) problems.phoneNumber = 'Enter 10 or 11 digits, no spaces.'
  if (!/^\d{12}$/.test(form.identityNo)) problems.identityNo = 'Enter the 12 digits of your citizen ID.'
  if (form.sex === '') problems.sex = 'Choose how you are recorded on the contract.'
  if (form.nationality.trim() === '') problems.nationality = 'Enter your nationality.'
  if (form.por.trim() === '') problems.por = 'Enter the address kept on your ID.'
  if (form.password === '') problems.password = 'Choose the password you will sign in with.'
  else if (form.confirmPassword !== form.password) problems.confirmPassword = 'Both passwords must match.'
  if (!confirmedInformation) problems.confirmIn4 = 'Confirm the information above is accurate.'

  return problems
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}
