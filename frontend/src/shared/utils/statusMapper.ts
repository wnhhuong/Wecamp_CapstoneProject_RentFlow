import type {
  AccountStatus,
  InvoiceStatus,
  RequestStatus,
  RoomStatus,
} from '@/shared/types/status'

export function mapRoomStatus(status?: string): RoomStatus {
  switch (status) {
    case 'available_now':
    case 'available now':
      return 'available now'

    case 'available_soon':
    case 'available soon':
      return 'available soon'

    case 'not_available':
    case 'not available':
      return 'not available'

    case 'rented':
      return 'rented'

    default:
      return 'not available'
  }
}

export function mapAccountStatus(status?: string): AccountStatus {
  switch (status) {
    case 'banned':
      return 'banned'

    case 'active':
      return 'active'

    case 'inactive':
    default:
      return 'inactive'
  }
}

export function mapInvoiceStatus(status?: string): InvoiceStatus {
  return status === 'paid' ? 'paid' : 'not_paid'
}

export function mapRequestStatus(status?: string): RequestStatus {
  return status === 'approved' ? 'approved' : 'pending'
}
