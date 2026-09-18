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
    consumptionRequest: (requestID: string | number) =>
      `/user/consumption-requests/${encodeURIComponent(String(requestID))}`,

    invoices: '/user/invoices',
    invoice: (invoiceID: string) =>
      `/user/invoices/${encodeURIComponent(invoiceID)}`,
    invoicePaidRequest: (invoiceID: string) =>
      `/user/invoices/${encodeURIComponent(invoiceID)}/paid-request`,
    invoiceLatePaymentRequest: (invoiceID: string) =>
      `/user/invoices/${encodeURIComponent(invoiceID)}/late-payment-request`,

    profile: '/user/profile',

    contract: '/user/contract',

    requests: '/user/requests',
    extendRequests: '/user/extend-requests',
    moveoutRequests: '/user/moveout-requests',
    request: (requestID: string) =>
      `/user/requests/${encodeURIComponent(requestID)}`,
  },

  admin: {
    rooms: '/admin/rooms',
    room: (roomID: string) =>
      `/admin/rooms/${encodeURIComponent(roomID)}`,
    parameters: '/admin/parameters',
    invoices: '/admin/invoices',

    invoice: (invoiceID: string) =>
      `/admin/invoices/${encodeURIComponent(invoiceID)}`,

    requests: '/admin/requests',

    request: (requestID: string) =>
      `/admin/requests/${encodeURIComponent(requestID)}`,

    approveRequest: (requestID: string) =>
      `/admin/requests/${encodeURIComponent(requestID)}/approve`,

    roomAccountPassword: (roomID: string) =>
      `/admin/rooms/${encodeURIComponent(roomID)}/account/password`,
  },
} as const
