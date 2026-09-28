import { ApiError, apiRequest } from '@/shared/api/client'
import { API_BASE_URL } from '@/shared/api/config'
import { ENDPOINTS } from '@/shared/api/endpoints'
import type {
  BackendTenantContract,
  TenantContract,
} from '@/shared/types/contract'

/** Null when the tenancy has no active contract, which is not an error here. */
export async function getTenantContract(
  signal?: AbortSignal,
): Promise<TenantContract | null> {
  try {
    const contract = await apiRequest<BackendTenantContract>(
      ENDPOINTS.user.contract,
      { auth: 'user', signal },
    )

    return mapContract(contract)
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 404) return null

    throw error
  }
}

function mapContract(contract: BackendTenantContract): TenantContract {
  const terms = contract.terms ?? {}

  return {
    contractID: contract.contractID,
    displayID: contract.displayID ?? contract.contractID,
    roomCode: contract.roomCode ?? '',
    startDate: contract.startDate,
    expireDate: contract.expireDate,
    rentPrice: contract.rentPrice,
    propertyDeposit: contract.propertyDeposit,
    status: contract.status === 'expired' ? 'expired' : 'active',
    signatureImage: toAbsoluteAssetUrl(contract.signature ?? ''),
    signedAt: contract.signedAt ?? null,
    terms: {
      template: terms.contractPlaceholder ?? '',
      electricityUnitPrice: terms.electricityUnitPrice ?? 0,
      waterPrice: terms.waterPrice ?? 0,
      wifiFee: terms.wifiFee ?? 0,
      otherFees: terms.otherFees ?? 0,
      yearToExtend: terms.yearToExtend ?? 1,
    },
  }
}

function toAbsoluteAssetUrl(path: string) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path

  const apiOrigin = new URL(API_BASE_URL, window.location.origin).origin
  return new URL(path, `${apiOrigin}/`).toString()
}
