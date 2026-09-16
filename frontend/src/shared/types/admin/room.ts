import type { ApiPagination } from '@/shared/types/api'
import type { AccountStatus, RoomStatus } from '@/shared/types/status'

export type CreateRoomStatus = Exclude<RoomStatus, 'rented'>

export type ElectricityState =
  | 'checked'
  | 'waiting_admin'
  | 'late'
  | 'not_applicable'

export interface RoomAccount {
  accountID: string
  username: string
  status: AccountStatus
}

export interface AdminArea {
  areaID: string
  areaName: string
}

export interface AdminRoom {
  roomID: string
  areaID: string
  areaName: string
  roomCode: string
  floor: number
  maxPeople: number
  roomDetail: string
  price: number
  deposit: number
  status: RoomStatus
  availableFrom: string | null
  images: string[]
  tenantName: string | null
  account: RoomAccount | null
  electricityState: ElectricityState
  stillOwed: number
}

export interface CreateRoomInput {
  areaID: string
  roomCode: string
  floor: number
  maxPeople: number
  roomDetail: string
  price: number
  deposit: number
  status: CreateRoomStatus
  availableFrom: string | null
  images: File[]
}

export interface PrepareRoomAccountInput {
  roomID: string
  temporaryPassword: string
}

export interface PreparedRoomCredential {
  accountID: string
  roomID: string
  username: string
  status: 'inactive'
  temporaryPassword: string
}

/**
 * Types representing data returned directly by the backend.
 */

export interface BackendRoomAccount {
  accountID: string
  username: string
  status: string
}

export interface BackendAdminRoom {
  roomID: string
  areaID?: string
  areaName?: string
  roomCode: string
  floor?: number
  maxPeople?: number
  roomDetail?: string
  price?: number
  deposit?: number
  status?: string
  availableFrom?: string | null
  images?: string[]
  tenantName?: string | null
  account?: BackendRoomAccount | null
  electricityState?: ElectricityState
  stillOwed?: number
}

export interface AdminRoomsResponse {
  items: BackendAdminRoom[]
  pagination?: ApiPagination
}