export function validDob(year: string, month: string, day: string) {
  if (!/^\d{4}$/.test(year) || !/^\d{1,2}$/.test(month) || !/^\d{1,2}$/.test(day)) return null
  const y = Number(year); const m = Number(month); const d = Number(day)
  const date = new Date(y, m - 1, d)
  const today = new Date()
  if (m < 1 || m > 12 || d < 1 || date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d || date > today) return null
  return `${year}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}
