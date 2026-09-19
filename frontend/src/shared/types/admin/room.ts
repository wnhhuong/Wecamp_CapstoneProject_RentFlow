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
  role?: string
  startDate?: string | null
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

export interface ActiveRoomContract {
  contractID: string
  userID: string
  roomID: string
  startDate: string | null
  expireDate: string | null
  deposit: number
  rent: number
  status: string
  signature: string | null
  signedAt: string | null
}

export interface RoomTenant {
  userID: string
  fullName: string
  phoneNumber: string
  identityNo: string
  dob: string | null
  sex: string
  nationality: string
  por: string
}

export interface AdminRoomDetail {
  room: Omit<AdminRoom, 'tenantName' | 'account' | 'electricityState' | 'stillOwed'>
  activeContract: ActiveRoomContract | null
  tenant: RoomTenant | null
  account: RoomAccount | null
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

export interface UpdateRoomInput {
  roomID: string
  roomCode: string
  floor: number
  maxPeople: number
  roomDetail: string
  price: number
  deposit: number
  replacementImages: File[]
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
  role?: string
  startDate?: string | null
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
  /** The one endpoint that renames `total` itself, so no mapping is needed. */
  pagination?: ApiPagination
}

export interface BackendAdminRoomDetail {
  room: BackendAdminRoom
  area: AdminArea | null
  activeContract: ActiveRoomContract | null
  tenant: RoomTenant | null
  account: BackendRoomAccount | null
  stillOwed: number
}
