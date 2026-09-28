import type { BackendPagination } from '@/shared/types/api'
import type { RoomStatus } from '@/shared/types/status'

export interface BackendGuestRoom {
  roomID: string
  roomCode: string
  areaID: string
  areaName: string
  status: string
  floor: number
  maxPeople: number
  price: number
  description: string
  availableFrom: string | null
  coverImage: string | null
}

export interface GuestRoom {
  roomID: string
  roomCode: string
  areaID: string
  areaName: string
  status: RoomStatus
  floor: number
  maxPeople: number
  price: number
  roomDetail: string
  availableFrom: string | null
  coverImage: string | null
}

export interface GuestRoomsResponse {
  items: BackendGuestRoom[]
  pagination?: BackendPagination
}

export interface BackendGuestRoomDetail {
  roomID: string
  roomCode: string
  areaID: string
  areaName: string
  status: string
  floor: number
  maxPeople: number
  roomDetail: string
  price: number
  deposit: number
  availableFrom: string | null
  images: string[]
  contact: GuestContact
}

export interface GuestRoomDetail extends Omit<GuestRoom, 'coverImage'> {
  deposit: number
  images: string[]
  contact: GuestContact
}

export interface GuestContact {
  adminPhone: string | null
  adminEmail: string | null
  adminFacebook: string | null
  adminZalo: string | null
}

export interface BackendGuestParameters {
  propertyName: { value: string }
  address: { value: string }
  adminPhone: { value: string }
  adminEmail: { value: string }
  adminFacebook?: { value: string } | null
  adminZalo?: { value: string } | null
}

export interface GuestProperty {
  propertyName: string
  address: string
  contact: GuestContact
}

export interface GuestRoomFilters {
  search?: string
  floor?: number
  status?: 'available_now' | 'available_soon'
  maxPeople?: number
  priceMin?: number
  priceMax?: number
  page?: number
  limit?: number
}

