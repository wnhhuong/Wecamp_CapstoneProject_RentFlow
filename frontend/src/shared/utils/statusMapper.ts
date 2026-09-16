import type {
  AccountStatus,
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