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

    invoicePaidRequest: (invoiceID: string) =>
      `/user/invoices/${encodeURIComponent(invoiceID)}/paid-request`,

    consumptionRequest: (requestID: string | number) =>
      `/user/consumption-requests/${encodeURIComponent(String(requestID))}`,
  },

  admin: {
    rooms: '/admin/rooms',
    room: (roomID: string) =>
      `/admin/rooms/${encodeURIComponent(roomID)}`,
    parameters: '/admin/parameters',
    requests: '/admin/requests',

    request: (requestID: string) =>
      `/admin/requests/${encodeURIComponent(requestID)}`,

    approveRequest: (requestID: string) =>
      `/admin/requests/${encodeURIComponent(requestID)}/approve`,

    roomAccountPassword: (roomID: string) =>
      `/admin/rooms/${encodeURIComponent(roomID)}/account/password`,
  },
} as const
