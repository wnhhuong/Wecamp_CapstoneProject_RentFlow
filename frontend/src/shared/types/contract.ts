export type ContractStatus = 'active' | 'expired'

export interface BackendTenantContract {
  contractID: string
  displayID?: string
  roomCode?: string
  startDate: string
  expireDate: string
  rentPrice: number
  propertyDeposit: number
  status?: string
  signature?: string
  signedAt?: string | null
  terms?: {
    contractPlaceholder?: string
    electricityUnitPrice?: number
    waterPrice?: number
    wifiFee?: number
    otherFees?: number
  } | null
}

export interface TenantContractTerms {
  /** Agreement body, still holding {token} placeholders. */
  template: string
  electricityUnitPrice: number
  waterPrice: number
  wifiFee: number
  otherFees: number
}

export interface TenantContract {
  contractID: string
  /** Human-readable code, e.g. "A-102-050924". */
  displayID: string
  roomCode: string
  startDate: string
  expireDate: string
  rentPrice: number
  propertyDeposit: number
  status: ContractStatus
  signatureImage: string
  signedAt: string | null
  terms: TenantContractTerms
}
