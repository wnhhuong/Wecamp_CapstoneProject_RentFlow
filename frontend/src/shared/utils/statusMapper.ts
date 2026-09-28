import type { ContractStatus } from '@/shared/types/contract'
import type {
  AccountStatus,
  InvoiceStatus,
  RequestStatus,
  RoomStatus,
  TicketStatus,
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

export function mapContractStatus(status?: string): ContractStatus {
  return status === 'active' ? 'active' : 'expired'
}

export function mapInvoiceStatus(status?: string): InvoiceStatus {
  return status === 'paid' ? 'paid' : 'not_paid'
}

export function mapRequestStatus(status?: string): RequestStatus {
  return status === 'approved' ? 'approved' : 'pending'
}

export function mapTicketStatus(status?: string): TicketStatus {
  switch (status) {
    case 'done':
      return 'done'

    case 'in_progress':
      return 'in_progress'

    case 'need_action':
    default:
      return 'need_action'
  }
}
