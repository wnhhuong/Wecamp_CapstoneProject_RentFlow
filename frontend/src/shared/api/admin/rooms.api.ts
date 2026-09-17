import { apiRequest } from '@/shared/api/client'
import { API_BASE_URL } from '@/shared/api/config'
import { ENDPOINTS } from '@/shared/api/endpoints'
import type {
  AdminRoomDetail,
  AdminRoom,
  AdminRoomsResponse,
  BackendAdminRoom,
  BackendAdminRoomDetail,
  BackendRoomAccount,
  CreateRoomInput,
  PrepareRoomAccountInput,
  PreparedRoomCredential,
  RoomAccount,
} from '@/shared/types/admin/room'
import { mapAccountStatus, mapRoomStatus } from '@/shared/utils/statusMapper'

const ROOMS_PAGE_SIZE = 100

export async function getAdminRooms(): Promise<AdminRoom[]> {
  const rooms: BackendAdminRoom[] = []
  let currentPage = 1

  while (true) {
    const searchParams = new URLSearchParams({
      page: String(currentPage),
      limit: String(ROOMS_PAGE_SIZE),
    })

    const response = await apiRequest<AdminRoomsResponse>(
      `${ENDPOINTS.admin.rooms}?${searchParams.toString()}`,
      {
        auth: 'admin',
      },
    )

    rooms.push(...response.items)

    const totalPages =
      response.pagination?.totalPages ?? currentPage

    if (currentPage >= totalPages) {
      break
    }

    currentPage += 1
  }

  return rooms.map(mapAdminRoom)
}

export async function getAdminRoomDetail(
  roomID: string,
): Promise<AdminRoomDetail> {
  const detail = await apiRequest<BackendAdminRoomDetail>(
    ENDPOINTS.admin.room(roomID),
    { auth: 'admin' },
  )
  const room = mapAdminRoom({
    ...detail.room,
    areaID: detail.area?.areaID,
    areaName: detail.area?.areaName,
  })

  return {
    room: {
      roomID: room.roomID,
      areaID: room.areaID,
      areaName: room.areaName,
      roomCode: room.roomCode,
      floor: room.floor,
      maxPeople: room.maxPeople,
      roomDetail: room.roomDetail,
      price: room.price,
      deposit: room.deposit,
      status: room.status,
      availableFrom: room.availableFrom,
      images: room.images,
    },
    activeContract: detail.activeContract,
    tenant: detail.tenant,
    account: detail.account ? mapRoomAccount(detail.account) : null,
    stillOwed: detail.stillOwed ?? 0,
  }
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
  body.append('status', input.status)

  if (input.availableFrom) {
    body.append('availableFrom', input.availableFrom)
  }

  input.images.forEach((image) => {
    body.append('images', image)
  })

  const createdRoom = await apiRequest<BackendAdminRoom>(
    ENDPOINTS.admin.rooms,
    {
      auth: 'admin',
      method: 'POST',
      body,
    },
  )

  return mapAdminRoom(createdRoom)
}

export async function prepareRoomAccount(
  input: PrepareRoomAccountInput,
): Promise<{
  room: AdminRoom
  credential: PreparedRoomCredential
}> {
  const temporaryPassword = input.temporaryPassword.trim()

  const credential = await apiRequest<
    Omit<PreparedRoomCredential, 'temporaryPassword'>
  >(
    ENDPOINTS.admin.roomAccountPassword(input.roomID),
    {
      auth: 'admin',
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        newPassword: temporaryPassword,
      }),
    },
  )

  const rooms = await getAdminRooms()

  const preparedRoom = rooms.find(
    (room) => room.roomID === credential.roomID,
  )

  if (!preparedRoom) {
    throw new Error('The prepared room could not be refreshed.')
  }

  return {
    room: preparedRoom,
    credential: {
      ...credential,
      temporaryPassword,
    },
  }
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
    images: (room.images ?? []).map(toAbsoluteAssetUrl),
    tenantName: room.tenantName ?? null,
    account: room.account
      ? mapRoomAccount(room.account)
      : null,
    electricityState:
      room.electricityState ?? 'not_applicable',
    stillOwed: room.stillOwed ?? 0,
  }
}

function mapRoomAccount(
  account: BackendRoomAccount,
): RoomAccount {
  return {
    accountID: account.accountID,
    username: account.username,
    status: mapAccountStatus(account.status),
    role: account.role,
    startDate: account.startDate ?? null,
  }
}

function toAbsoluteAssetUrl(path: string) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path

  const apiOrigin = new URL(API_BASE_URL, window.location.origin).origin
  return new URL(path, `${apiOrigin}/`).toString()
}
