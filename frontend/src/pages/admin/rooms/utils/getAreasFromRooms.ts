import type {
  AdminArea,
  AdminRoom,
} from '@/shared/types/admin/room'

export function getAreasFromRooms(rooms: AdminRoom[]): AdminArea[] {
  const areas = new Map<string, string>()

  rooms.forEach((room) => {
    if (room.areaID && room.areaName) {
      areas.set(room.areaID, room.areaName)
    }
  })

  return Array.from(
    areas,
    ([areaID, areaName]) => ({
      areaID,
      areaName,
    }),
  ).sort((left, right) =>
    left.areaName.localeCompare(right.areaName),
  )
}