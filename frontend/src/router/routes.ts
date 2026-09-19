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
      requestDetails: '/user/requests/:requestId',
      requestDetailsLink: (requestId: string) =>
        `/user/requests/${requestId}`,
      tickets: '/user/tickets',
      profile: '/user/profile',
    },
  
    admin: {
      root: '/admin',
      dashboard: '/admin/dashboard',
      rooms: '/admin/rooms',
      roomDetails: '/admin/rooms/:roomId',
      roomDetailsLink: (roomId: string) =>
        `/admin/rooms/${encodeURIComponent(roomId)}`,
      users: '/admin/users',
      invoices: '/admin/invoices',
      invoiceDetails: '/admin/invoices/:invoiceId',
      invoiceDetailsLink: (invoiceId: string) =>
        `/admin/invoices/${invoiceId}`,
      parameters: '/admin/parameters',
      property: '/admin/property',
      tickets: '/admin/tickets',
      ticketDetails: '/admin/tickets/:ticketId',
      ticketDetailsLink: (ticketId: string) =>
        `/admin/tickets/${encodeURIComponent(ticketId)}`,
      requests: '/admin/requests',
      requestDetails: '/admin/requests/:requestId',
      requestDetailsLink: (requestId: string) =>
        `/admin/requests/${encodeURIComponent(requestId)}`,
    },
  } as const
  
  export { ROUTES }
