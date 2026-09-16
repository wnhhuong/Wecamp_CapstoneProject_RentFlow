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

  admin: {
    rooms: '/admin/rooms',
    roomAccountPassword: (roomID: string) =>
      `/admin/rooms/${encodeURIComponent(roomID)}/account/password`,
  },

  user: {
    // thêm user endpoint sau
  },

  guest: {
    // thêm guest endpoint sau
  },
} as const
