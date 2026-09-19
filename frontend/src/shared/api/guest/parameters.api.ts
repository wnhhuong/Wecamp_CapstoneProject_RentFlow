import { apiRequest } from '@/shared/api/client'
import { ENDPOINTS } from '@/shared/api/endpoints'
import type { BackendGuestParameters, GuestProperty } from '@/shared/types/guest/room'

export async function getGuestProperty(): Promise<GuestProperty> {
  const parameters = await apiRequest<BackendGuestParameters>(ENDPOINTS.guest.parameters)

  return {
    propertyName: parameters.propertyName.value,
    address: parameters.address.value,
    contact: {
      adminPhone: parameters.adminPhone.value,
      adminEmail: parameters.adminEmail.value,
      adminFacebook: parameters.adminFacebook?.value ?? null,
      adminZalo: parameters.adminZalo?.value ?? null,
    },
  }
}
