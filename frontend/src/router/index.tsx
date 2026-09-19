import { createBrowserRouter, Navigate } from "react-router";

import App from "@/App";
import { InvoicesPage } from "@/pages/admin/InvoicesPage";
import { DashboardPage } from "@/pages/admin/DashboardPage";
import { InvoiceDetailsSheet } from "@/pages/admin/invoices/InvoiceDetailsSheet";
import { RequestDetailsSheet } from "@/pages/admin/requests/RequestDetailsSheet";
import { RoomDetailsSheet } from "@/pages/admin/rooms/RoomDetailsSheet";
import { TicketDetailsSheet } from "@/pages/admin/tickets/TicketDetailsSheet";
import { RequestsPage } from "@/pages/admin/RequestsPage";
import { ParametersPage } from "@/pages/admin/ParametersPage";
import { PropertyPage } from "@/pages/admin/PropertyPage";
import { TicketsPage as AdminTicketsPage } from "@/pages/admin/TicketsPage";
import { RoomsPage } from "@/pages/admin/RoomsPage";
import { UsersPage } from "@/pages/admin/UsersPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { FirstLoginProfilePage } from "@/pages/auth/first-login/FirstLoginProfilePage";
import { FirstLoginContractPage } from "@/pages/auth/first-login/FirstLoginContractPage";
import { RoomsPage as GuestRoomsPage } from "@/pages/guest/RoomsPage";
import { RoomDetailsPage } from "@/pages/guest/RoomDetailsPage";
import { ConsumptionPage } from "@/pages/user/ConsumptionPage";
import { DashboardPage as TenantDashboardPage } from "@/pages/user/DashboardPage";
import { InvoiceListPage } from "@/pages/user/InvoiceListPage";
import { ProfilePage } from "@/pages/user/ProfilePage";
import { RequestListPage } from "@/pages/user/RequestListPage";
import { TicketListPage } from "@/pages/user/TicketListPage";
import { InvoiceDetailsSheet as TenantInvoiceDetailsSheet } from "@/pages/user/invoices/InvoiceDetailsSheet";
import { RequestDetailsSheet as TenantRequestDetailsSheet } from "@/pages/user/requests/RequestDetailsSheet";
import { RequireAuth } from "@/router/require-auth";
import { RequireOnboarding } from "@/router/require-onboarding";
import { RoutePlaceholder } from "@/router/route-placeholder";
import { RouterErrorPage } from "@/router/router-error-page";
import { ROUTES } from "@/router/routes";

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
        element: <GuestRoomsPage />,
      },
      {
        path: ROUTES.guest.roomDetails,
        element: <RoomDetailsPage />,
      },

      {
        path: ROUTES.auth.login,
        element: <LoginPage />,
      },
      {
        path: ROUTES.auth.firstLoginProfile,
        element: (
          <RequireOnboarding>
            <FirstLoginProfilePage />
          </RequireOnboarding>
        ),
      },
      {
        path: ROUTES.auth.firstLoginContract,
        element: (
          <RequireOnboarding>
            <FirstLoginContractPage />
          </RequireOnboarding>
        ),
      },

      {
        path: ROUTES.user.root,
        element: (
          <RequireAuth role="user">
            <Navigate to={ROUTES.user.dashboard} replace />
          </RequireAuth>
        ),
      },
      {
        path: ROUTES.user.dashboard,
        element: (
          <RequireAuth role="user">
            <TenantDashboardPage />
          </RequireAuth>
        ),
      },
      {
        path: ROUTES.user.electricity,
        element: (
          <RequireAuth role="user">
            <ConsumptionPage />
          </RequireAuth>
        ),
      },
      {
        path: ROUTES.user.invoices,
        element: (
          <RequireAuth role="user">
            <InvoiceListPage />
          </RequireAuth>
        ),
        children: [
          { path: ":invoiceId", element: <TenantInvoiceDetailsSheet /> },
        ],
      },
      {
        path: ROUTES.user.requests,
        element: (
          <RequireAuth role="user">
            <RequestListPage />
          </RequireAuth>
        ),
        children: [
          { path: ":requestId", element: <TenantRequestDetailsSheet /> },
        ],
      },
      {
        path: ROUTES.user.tickets,
        element: (
          <RequireAuth role="user">
            <TicketListPage />
          </RequireAuth>
        ),
      },
      {
        path: ROUTES.user.profile,
        element: (
          <RequireAuth role="user">
            <ProfilePage />
          </RequireAuth>
        ),
      },

      {
        path: ROUTES.admin.root,
        element: (
          <RequireAuth role="admin">
            <Navigate to={ROUTES.admin.dashboard} replace />
          </RequireAuth>
        ),
      },
      {
        path: ROUTES.admin.dashboard,
        element: (
          <RequireAuth role="admin">
            <DashboardPage />
          </RequireAuth>
        ),
      },
      {
        path: ROUTES.admin.rooms,
        element: (
          <RequireAuth role="admin">
            <RoomsPage />
          </RequireAuth>
        ),
        children: [{ path: ":roomId", element: <RoomDetailsSheet /> }],
      },
      {
        path: ROUTES.admin.users,
        element: (
          <RequireAuth role="admin">
            <UsersPage />
          </RequireAuth>
        ),
      },
      {
        path: ROUTES.admin.invoices,
        element: (
          <RequireAuth role="admin">
            <InvoicesPage />
          </RequireAuth>
        ),
        children: [{ path: ":invoiceId", element: <InvoiceDetailsSheet /> }],
      },
      {
        path: ROUTES.admin.parameters,
        element: (
          <RequireAuth role="admin">
            <ParametersPage />
          </RequireAuth>
        ),
      },
      {
        path: ROUTES.admin.property,
        element: (
          <RequireAuth role="admin">
            <PropertyPage />
          </RequireAuth>
        ),
      },
      {
        path: ROUTES.admin.tickets,
        element: (
          <RequireAuth role="admin">
            <AdminTicketsPage />
          </RequireAuth>
        ),
        children: [{ path: ":ticketId", element: <TicketDetailsSheet /> }],
      },
      {
        path: ROUTES.admin.requests,
        element: (
          <RequireAuth role="admin">
            <RequestsPage />
          </RequireAuth>
        ),
        children: [{ path: ":requestId", element: <RequestDetailsSheet /> }],
      },

      {
        path: "*",
        element: <RoutePlaceholder title="Page not found" />,
      },
    ],
  },
]);

export { router };
