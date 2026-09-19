import { apiRequest } from '@/shared/api/client'
import { API_BASE_URL } from '@/shared/api/config'
import { ENDPOINTS } from '@/shared/api/endpoints'
import type {
  BackendGuestRoom,
  BackendGuestRoomDetail,
  GuestRoom,
  GuestRoomDetail,
  GuestRoomFilters,
  GuestRoomsResponse,
} from '@/shared/types/guest/room'
import { mapRoomStatus } from '@/shared/utils/statusMapper'

export async function getGuestRooms(
  filters: GuestRoomFilters = {},
): Promise<{ items: GuestRoom[]; pagination: GuestRoomsResponse['pagination'] }> {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value))
  })

  const response = await apiRequest<GuestRoomsResponse>(
    `${ENDPOINTS.guest.rooms}?${params.toString()}`,
  )

  return {
    items: response.items.map(mapGuestRoom),
    pagination: response.pagination,
  }
}

export async function getGuestRoomDetail(roomID: string): Promise<GuestRoomDetail> {
  const room = await apiRequest<BackendGuestRoomDetail>(ENDPOINTS.guest.room(roomID))
  return {
    roomID: room.roomID,
    roomCode: room.roomCode,
    areaID: room.areaID,
    areaName: room.areaName,
    status: mapRoomStatus(room.status),
    floor: room.floor,
    maxPeople: room.maxPeople,
    price: room.price,
    roomDetail: room.roomDetail,
    availableFrom: room.availableFrom,
    deposit: room.deposit,
    images: room.images.map(toAbsoluteAssetUrl).filter(isPresent),
    contact: room.contact,
  }
}

function mapGuestRoom(room: BackendGuestRoom): GuestRoom {
  return {
    roomID: room.roomID,
    roomCode: room.roomCode,
    areaID: room.areaID,
    areaName: room.areaName,
    status: mapRoomStatus(room.status),
    floor: room.floor,
    maxPeople: room.maxPeople,
    price: room.price,
    roomDetail: room.description,
    availableFrom: room.availableFrom,
    coverImage: toAbsoluteAssetUrl(room.coverImage),
  }
}

function toAbsoluteAssetUrl(path: string | null): string | null {
  if (!path) return null
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path

  const apiOrigin = new URL(API_BASE_URL, window.location.origin).origin
  return new URL(path, `${apiOrigin}/`).toString()
}

function isPresent<T>(value: T | null): value is T {
  return value !== null
}
