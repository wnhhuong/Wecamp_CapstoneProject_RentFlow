// Endpoint paths
export const ENDPOINTS = {
  auth: {
    login: '/auth/login',
  },

  guest: {
    rooms: '/rooms',
    parameters: '/parameters',
  },

  user: {
    consumptionContext: '/user/consumption-requests/context',
    consumptionRequests: '/user/consumption-requests',

    consumptionRequest: (requestID: string | number) =>
      `/user/consumption-requests/${encodeURIComponent(String(requestID))}`,
  },

  admin: {
    rooms: '/admin/rooms',
    parameters: '/admin/parameters',

    roomAccountPassword: (roomID: string) =>
      `/admin/rooms/${encodeURIComponent(roomID)}/account/password`,
  },
} as const