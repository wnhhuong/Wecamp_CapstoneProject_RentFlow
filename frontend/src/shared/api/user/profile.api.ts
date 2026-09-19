import { apiRequest } from '@/shared/api/client'
import { ENDPOINTS } from '@/shared/api/endpoints'
import type {
  BackendTenantProfile,
  TenantProfile,
  TenantProfileUpdate,
} from '@/shared/types/profile'
import { mapSex } from '@/shared/utils/sexLabels'

export async function getTenantProfile(
  signal?: AbortSignal,
): Promise<TenantProfile> {
  const profile = await apiRequest<BackendTenantProfile>(
    ENDPOINTS.user.profile,
    { auth: 'user', signal },
  )

  return mapProfile(profile)
}

export async function updateTenantProfile(
  update: TenantProfileUpdate,
  signal?: AbortSignal,
): Promise<TenantProfile> {
  const profile = await apiRequest<BackendTenantProfile>(
    ENDPOINTS.user.profile,
    {
      auth: 'user',
      method: 'PATCH',
      // The backend names this field `por`.
      body: JSON.stringify({
        phoneNumber: update.phoneNumber,
        por: update.placeOfResidence,
      }),
      signal,
    },
  )

  return mapProfile(profile)
}

function mapProfile(profile: BackendTenantProfile): TenantProfile {
  return {
    userID: profile.userID,
    fullName: profile.fullName,
    dob: profile.dob ?? null,
    phoneNumber: profile.phoneNumber,
    identityNo: profile.identityNo,
    sex: mapSex(profile.sex),
    nationality: profile.nationality,
    placeOfResidence: profile.por,
  }
}

