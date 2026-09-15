export type RoomStatus =
  | 'available now'
  | 'rented'
  | 'available soon'
  | 'not available'

export type CreateRoomStatus = Exclude<RoomStatus, 'rented'>

export type RoomAccountStatus = 'banned' | 'inactive' | 'active'

export interface RoomAccount {
  accountID: string
  username: string
  status: RoomAccountStatus
}

export interface AdminArea {
  areaID: string
  areaName: string
}

export type ElectricityState =
  | 'checked'
  | 'waiting_admin'
  | 'late'
  | 'not_applicable'

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

interface ApiResponse<T> {
  success: boolean
  data: T | null
  message: string | null
}

interface AdminRoomsResponse {
  items: BackendAdminRoom[]
}

interface BackendAdminRoom {
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

interface BackendRoomAccount {
  accountID: string
  username: string
  status: string
}

interface LoginResponse {
  accessToken: string | null
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ??
  'http://localhost:5000/api'

const ACCESS_TOKEN_KEY = 'rentflow_access_token'

export async function getAdminRooms(): Promise<AdminRoom[]> {
  const response = await apiRequest<AdminRoomsResponse>('/admin/rooms')
  return response.items.map(mapAdminRoom)
}

export function getAreasFromRooms(rooms: AdminRoom[]): AdminArea[] {
  const areas = new Map<string, string>()

  rooms.forEach((room) => {
    if (room.areaID && room.areaName) areas.set(room.areaID, room.areaName)
  })

  return Array.from(areas, ([areaID, areaName]) => ({ areaID, areaName })).sort(
    (left, right) => left.areaName.localeCompare(right.areaName),
  )
}

export async function createAdminRoom(
  input: CreateRoomInput,
): Promise<AdminRoom> {
  const body = new FormData()

  body.append('areaID', input.areaID)
  body.append('roomCode', input.roomCode.trim().toUpperCase())
  body.append('floor', String(input.floor))
  body.append('maxPeople', String(input.maxPeople))
  body.append('roomDetail', input.roomDetail.trim())
  body.append('price', String(input.price))
  body.append('deposit', String(input.deposit))

  input.images.forEach((image) => body.append('images', image))

  const createdRoom = await apiRequest<BackendAdminRoom>('/admin/rooms', {
    method: 'POST',
    body,
  })

  return mapAdminRoom(createdRoom)
}

export async function prepareRoomAccount(
  input: PrepareRoomAccountInput,
): Promise<{ room: AdminRoom; credential: PreparedRoomCredential }> {
  const credential = await apiRequest<Omit<PreparedRoomCredential, 'temporaryPassword'>>(
    `/admin/rooms/${input.roomID}/account/password`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        newPassword: input.temporaryPassword,
      }),
    },
  )

  const rooms = await getAdminRooms()
  const preparedRoom = rooms.find((room) => room.roomID === credential.roomID)

  if (!preparedRoom) {
    throw new Error('The prepared room could not be refreshed.')
  }

  return {
    room: preparedRoom,
    credential: {
      ...credential,
      temporaryPassword: input.temporaryPassword,
    },
  }
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAccessToken()
  const headers = new Headers(options.headers)

  headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  const payload = (await response.json().catch(() => null)) as
    | ApiResponse<T>
    | { message?: string }
    | null

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : 'The request could not be completed.'
    throw new Error(message)
  }

  if (!payload || !('success' in payload) || !payload.success) {
    throw new Error('The backend returned an invalid response.')
  }

  return payload.data as T
}

async function getAccessToken() {
  const storedToken = window.localStorage.getItem(ACCESS_TOKEN_KEY)
  if (storedToken) return storedToken

  const token = await loginWithSeedAdmin()
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token)
  return token
}

async function loginWithSeedAdmin() {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: import.meta.env.VITE_DEV_ADMIN_USERNAME ?? 'admin',
      password: import.meta.env.VITE_DEV_ADMIN_PASSWORD ?? 'Admin@123',
    }),
  })

  const payload = (await response.json().catch(() => null)) as
    | ApiResponse<LoginResponse>
    | { message?: string }
    | null

  if (!response.ok || !payload || !('success' in payload) || !payload.success) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : 'Admin login failed.'
    throw new Error(message)
  }

  if (!payload.data?.accessToken) {
    throw new Error('Admin login did not return an access token.')
  }

  return payload.data.accessToken
}

function mapAdminRoom(room: BackendAdminRoom): AdminRoom {
  return {
    roomID: room.roomID,
    areaID: room.areaID ?? '',
    areaName: room.areaName ?? 'Unknown area',
    roomCode: room.roomCode,
    floor: room.floor ?? 0,
    maxPeople: room.maxPeople ?? 1,
    roomDetail: room.roomDetail ?? '',
    price: room.price ?? 0,
    deposit: room.deposit ?? 0,
    status: mapRoomStatus(room.status),
    availableFrom: room.availableFrom ?? null,
    images: room.images ?? [],
    tenantName: room.tenantName ?? null,
    account: room.account ? mapRoomAccount(room.account) : null,
    electricityState: room.electricityState ?? 'not_applicable',
    stillOwed: room.stillOwed ?? 0,
  }
}

function mapRoomAccount(account: BackendRoomAccount): RoomAccount {
  return {
    accountID: account.accountID,
    username: account.username,
    status: mapAccountStatus(account.status),
  }
}

function mapRoomStatus(status?: string): RoomStatus {
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

function mapAccountStatus(status?: string): RoomAccountStatus {
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
