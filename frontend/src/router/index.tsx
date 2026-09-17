import { createBrowserRouter, Navigate } from "react-router";

import App from "@/App";
import { RequestsPage } from "@/pages/admin/RequestsPage";
import { ParametersPage } from "@/pages/admin/ParametersPage";
import { RoomsPage } from "@/pages/admin/RoomsPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import ConsumptionPage from "@/pages/user/consumption/ConsumptionPage";
import { InvoiceDetailsPage } from "@/pages/user/invoices/InvoiceDetailsPage";
import { InvoiceListPage } from "@/pages/user/invoices/InvoiceListPage";
import { RequireAuth } from "@/router/require-auth";
import { RoutePlaceholder } from "@/router/route-placeholder";
import { RouterErrorPage } from "@/router/router-error-page";
import { ROUTES } from "@/router/routes";

import { FirstLoginProfilePage } from "@/pages/auth/first-login/FirstLoginProfilePage";
import { FirstLoginContractPage } from "@/pages/auth/first-login/FirstLoginContractPage";
import { RequireOnboarding } from "@/router/require-onboarding";

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
        element: <LoginPage />,
      },
      {
        path: ROUTES.auth.firstLoginProfile,
        element: <RequireOnboarding><FirstLoginProfilePage /></RequireOnboarding>,
      },
      {
        path: ROUTES.auth.firstLoginContract,
        element: <RequireOnboarding><FirstLoginContractPage /></RequireOnboarding>,
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
            <RoutePlaceholder title="Tenant dashboard" />
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
      },
      {
        path: ROUTES.user.invoiceDetails,
        element: (
          <RequireAuth role="user">
            <InvoiceDetailsPage />
          </RequireAuth>
        ),
      },
      {
        path: ROUTES.user.requests,
        element: (
          <RequireAuth role="user">
            <RoutePlaceholder title="Requests" />
          </RequireAuth>
        ),
      },
      {
        path: ROUTES.user.tickets,
        element: (
          <RequireAuth role="user">
            <RoutePlaceholder title="Tickets" />
          </RequireAuth>
        ),
      },
      {
        path: ROUTES.user.profile,
        element: (
          <RequireAuth role="user">
            <RoutePlaceholder title="Profile and lease" />
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
            <RoutePlaceholder title="Admin dashboard" />
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
      },
      {
        path: ROUTES.admin.users,
        element: (
          <RequireAuth role="admin">
            <RoutePlaceholder title="Users" />
          </RequireAuth>
        ),
      },
      {
        path: ROUTES.admin.invoices,
        element: (
          <RequireAuth role="admin">
            <RoutePlaceholder title="Invoices" />
          </RequireAuth>
        ),
      },
      {
        path: ROUTES.admin.invoiceDetails,
        element: (
          <RequireAuth role="admin">
            <RoutePlaceholder title="Invoice details" />
          </RequireAuth>
        ),
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
        path: ROUTES.admin.tickets,
        element: (
          <RequireAuth role="admin">
            <RoutePlaceholder title="Tickets" />
          </RequireAuth>
        ),
      },
      {
        path: ROUTES.admin.requests,
        element: (
          <RequireAuth role="admin">
            <RequestsPage />
          </RequireAuth>
        ),
      },

      {
        path: "*",
        element: <RoutePlaceholder title="Page not found" />,
      },
    ],
  },
]);

export { router };


