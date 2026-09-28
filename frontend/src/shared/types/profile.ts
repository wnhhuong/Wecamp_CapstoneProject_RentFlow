export type TenantSex = 'male' | 'female' | 'other'

export interface BackendTenantProfile {
  userID: string
  fullName: string
  dob: string | null
  phoneNumber: string
  identityNo: string
  sex?: string
  nationality: string
  por: string
}

export interface TenantProfile {
  userID: string
  fullName: string
  /** Calendar date, "YYYY-MM-DD". */
  dob: string | null
  phoneNumber: string
  identityNo: string
  sex: TenantSex
  nationality: string
  placeOfResidence: string
}

/**
 * The only fields a tenant may change themselves; the rest belong to the signed
 * lease and are updated by the owner.
 */
export interface TenantProfileUpdate {
  phoneNumber: string
  placeOfResidence: string
}
