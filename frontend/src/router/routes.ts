const ROUTES = {
    home: '/',
  
    guest: {
      rooms: '/rooms',
      roomDetails: '/rooms/:roomId',
      roomDetailsLink: (roomId: string) => `/rooms/${roomId}`,
    },
  
    auth: {
      login: '/login',
      firstLoginProfile: '/first-login/profile',
      firstLoginContract: '/first-login/contract',
    },
  
    user: {
      root: '/user',
      dashboard: '/user/dashboard',
      electricity: '/user/electricity',
      invoices: '/user/invoices',
      invoiceDetails: '/user/invoices/:invoiceId',
      invoiceDetailsLink: (invoiceId: string) =>
        `/user/invoices/${invoiceId}`,
      requests: '/user/requests',
      requestDetailsLink: (requestId: string) =>
        `/user/requests/${requestId}`,
      tickets: '/user/tickets',
      profile: '/user/profile',
    },
  
    admin: {
      root: '/admin',
      dashboard: '/admin/dashboard',
      rooms: '/admin/rooms',
      users: '/admin/users',
      invoices: '/admin/invoices',
      parameters: '/admin/parameters',
      tickets: '/admin/tickets',
      approvals: '/admin/approvals',
    },
  } as const
  
  export { ROUTES }
