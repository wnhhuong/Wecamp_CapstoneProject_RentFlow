import { createBrowserRouter, Navigate } from 'react-router'

import App from '@/App'
import { RoomsPage } from '@/pages/admin/RoomsPage'
import { RoutePlaceholder } from '@/router/route-placeholder'
import { RouterErrorPage } from '@/router/router-error-page'
import { ROUTES } from '@/router/routes'

const router = createBrowserRouter([
  {
    path: ROUTES.home,
    Component: App,
    errorElement: <RouterErrorPage />,
    children: [
      {
        index: true,
        element: <Navigate to={ROUTES.guest.rooms} replace />,
      },

      {
        path: ROUTES.guest.rooms,
        element: <RoutePlaceholder title="Browse rooms" />,
      },
      {
        path: ROUTES.guest.roomDetails,
        element: <RoutePlaceholder title="Room details" />,
      },

      {
        path: ROUTES.auth.login,
        element: <RoutePlaceholder title="Log in" />,
      },
      {
        path: ROUTES.auth.firstLoginProfile,
        element: <RoutePlaceholder title="Complete profile" />,
      },
      {
        path: ROUTES.auth.firstLoginContract,
        element: <RoutePlaceholder title="Review contract" />,
      },

      {
        path: ROUTES.user.root,
        element: <Navigate to={ROUTES.user.dashboard} replace />,
      },
      {
        path: ROUTES.user.dashboard,
        element: <RoutePlaceholder title="Tenant dashboard" />,
      },
      {
        path: ROUTES.user.electricity,
        element: <RoutePlaceholder title="Electricity" />,
      },
      {
        path: ROUTES.user.invoices,
        element: <RoutePlaceholder title="Invoices" />,
      },
      {
        path: ROUTES.user.invoiceDetails,
        element: <RoutePlaceholder title="Invoice details" />,
      },
      {
        path: ROUTES.user.requests,
        element: <RoutePlaceholder title="Requests" />,
      },
      {
        path: ROUTES.user.tickets,
        element: <RoutePlaceholder title="Tickets" />,
      },
      {
        path: ROUTES.user.profile,
        element: <RoutePlaceholder title="Profile and lease" />,
      },

      {
        path: ROUTES.admin.root,
        element: <Navigate to={ROUTES.admin.dashboard} replace />,
      },
      {
        path: ROUTES.admin.dashboard,
        element: <RoutePlaceholder title="Admin dashboard" />,
      },
      {
        path: ROUTES.admin.rooms,
        element: <RoomsPage />,
      },
      {
        path: ROUTES.admin.users,
        element: <RoutePlaceholder title="Users" />,
      },
      {
        path: ROUTES.admin.invoices,
        element: <RoutePlaceholder title="Invoices" />,
      },
      {
        path: ROUTES.admin.tickets,
        element: <RoutePlaceholder title="Tickets" />,
      },
      {
        path: ROUTES.admin.approvals,
        element: <RoutePlaceholder title="Approvals" />,
      },

      {
        path: '*',
        element: <RoutePlaceholder title="Page not found" />,
      },
    ],
  },
])

export { router }
