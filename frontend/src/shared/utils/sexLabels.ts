import type { TenantSex } from '@/shared/types/profile'

export const SEX_LABELS: Record<TenantSex, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
}

export function mapSex(sex?: string | null): TenantSex {
  return sex === 'male' || sex === 'female' ? sex : 'other'
}
