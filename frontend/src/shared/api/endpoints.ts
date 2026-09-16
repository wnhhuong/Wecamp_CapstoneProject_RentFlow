// Endpoint paths
export const ENDPOINTS = {
  auth: {
    login: '/auth/login',

    firstLogin: {
      profile: '/auth/first-login/profile',
      contractPreview: '/auth/first-login/contract-preview',
      contract: '/auth/first-login/contract',
    },
  },

  guest: {
    rooms: '/rooms',
    parameters: '/parameters',
  },

  user: {
    consumptionContext: '/user/consumption-requests/context',
    consumptionRequests: '/user/consumption-requests',

    invoices: '/user/invoices',

    invoice: (invoiceID: string) =>
      `/user/invoices/${encodeURIComponent(invoiceID)}`,

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