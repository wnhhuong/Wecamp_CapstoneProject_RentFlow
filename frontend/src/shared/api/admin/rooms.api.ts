export type RoomStatus =
  | 'available now'
  | 'rented'
  | 'available soon'
  | 'not available'

export type CreateRoomStatus = Exclude<RoomStatus, 'rented'>

export type ElectricityState =
  | 'checked'
  | 'waiting_admin'
  | 'late'
  | 'not_applicable'

export interface AdminRoom {
  roomID: number
  areaID: number
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
  electricityState: ElectricityState
  stillOwed: number
}

export interface CreateRoomInput {
  areaID: number
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

const areaNames: Record<number, string> = {
  1: 'Block A',
  2: 'Block B',
  3: 'Block C',
  4: 'Block D',
}

let rooms: AdminRoom[] = [
  {
    roomID: 101,
    areaID: 1,
    areaName: 'Block A',
    roomCode: 'A-101',
    floor: 1,
    maxPeople: 2,
    roomDetail: 'Bright corner room with a private bathroom.',
    price: 3200000,
    deposit: 3200000,
    status: 'available now',
    availableFrom: null,
    images: ['room-a-101.jpg'],
    tenantName: null,
    electricityState: 'not_applicable',
    stillOwed: 0,
  },
  {
    roomID: 102,
    areaID: 1,
    areaName: 'Block A',
    roomCode: 'A-102',
    floor: 1,
    maxPeople: 2,
    roomDetail: 'Furnished room near the shared kitchen.',
    price: 3000000,
    deposit: 3000000,
    status: 'rented',
    availableFrom: null,
    images: ['room-a-102.jpg'],
    tenantName: 'Trần Minh Quân',
    electricityState: 'checked',
    stillOwed: 0,
  },
  {
    roomID: 105,
    areaID: 2,
    areaName: 'Block B',
    roomCode: 'B-201',
    floor: 2,
    maxPeople: 3,
    roomDetail: 'Large room with natural light.',
    price: 3600000,
    deposit: 3600000,
    status: 'available soon',
    availableFrom: '2026-10-15',
    images: ['room-b-201.jpg'],
    tenantName: 'Lê Thị Ngọc',
    electricityState: 'waiting_admin',
    stillOwed: 3600000,
  },
  {
    roomID: 109,
    areaID: 3,
    areaName: 'Block C',
    roomCode: 'C-301',
    floor: 3,
    maxPeople: 1,
    roomDetail: 'Compact room for one tenant.',
    price: 2600000,
    deposit: 2600000,
    status: 'not available',
    availableFrom: null,
    images: ['room-c-301.jpg'],
    tenantName: null,
    electricityState: 'not_applicable',
    stillOwed: 0,
  },
]

let nextRoomID = 110

function wait(duration = 450) {
  return new Promise((resolve) => window.setTimeout(resolve, duration))
}

export async function getAdminRooms(): Promise<AdminRoom[]> {
  await wait(250)
  return rooms.map((room) => ({ ...room, images: [...room.images] }))
}

export async function createAdminRoom(
  input: CreateRoomInput,
): Promise<AdminRoom> {
  await wait()

  const roomCode = input.roomCode.trim().toUpperCase()
  const hasDuplicate = rooms.some(
    (room) => room.roomCode.toUpperCase() === roomCode,
  )

  if (hasDuplicate) {
    throw new Error(`Room code ${roomCode} already exists.`)
  }

  const createdRoom: AdminRoom = {
    roomID: nextRoomID++,
    areaID: input.areaID,
    areaName: areaNames[input.areaID] ?? `Area ${input.areaID}`,
    roomCode,
    floor: input.floor,
    maxPeople: input.maxPeople,
    roomDetail: input.roomDetail.trim(),
    price: input.price,
    deposit: input.deposit,
    status: input.status,
    availableFrom:
      input.status === 'available soon' ? input.availableFrom : null,
    images: input.images.map((image) => image.name),
    tenantName: null,
    electricityState: 'not_applicable',
    stillOwed: 0,
  }

  rooms = [createdRoom, ...rooms]
  return { ...createdRoom, images: [...createdRoom.images] }
}
