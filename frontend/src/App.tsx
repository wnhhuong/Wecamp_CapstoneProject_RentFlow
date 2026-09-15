import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";

import {
  Footer,
  Header,
  Sidebar,
  type SidebarNavItem,
} from "@/components/layout";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ROUTES } from "@/router/routes";

const userNavigation: SidebarNavItem[] = [
  {
    id: "dashboard",
    label: "Home",
    to: ROUTES.user.dashboard,
    end: true,
  },
  {
    id: "electricity",
    label: "Electricity",
    to: ROUTES.user.electricity,
  },
  {
    id: "invoices",
    label: "Invoices",
    to: ROUTES.user.invoices,
  },
  {
    id: "requests",
    label: "Requests",
    to: ROUTES.user.requests,
  },
  {
    id: "tickets",
    label: "Tickets",
    to: ROUTES.user.tickets,
  },
  {
    id: "profile",
    label: "Profile & lease",
    to: ROUTES.user.profile,
  },
];

const adminNavigation: SidebarNavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    to: ROUTES.admin.dashboard,
    end: true,
  },
  {
    id: "rooms",
    label: "Rooms & leases",
    to: ROUTES.admin.rooms,
  },
  {
    id: "users",
    label: "Users",
    to: ROUTES.admin.users,
  },
  {
    id: "invoices",
    label: "Invoices",
    to: ROUTES.admin.invoices,
  },
  {
    id: "parameters",
    label: "Parameters",
    to: ROUTES.admin.parameters,
  },
  {
    id: "tickets",
    label: "Tickets",
    to: ROUTES.admin.tickets,
  },
  {
    id: "approvals",
    label: "Approvals",
    to: ROUTES.admin.approvals,
  },
];

function App() {
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const isUserRoute = location.pathname.startsWith(ROUTES.user.root);
  const isAdminRoute = location.pathname.startsWith(ROUTES.admin.root);
  const isAuthRoute =
    location.pathname === ROUTES.auth.login ||
    location.pathname.startsWith("/first-login");

  const isSignedInRoute = isUserRoute || isAdminRoute;

  const headerVariant = isSignedInRoute
    ? "signed-in"
    : isAuthRoute
      ? "auth"
      : "guest";

  const navigationItems = isAdminRoute ? adminNavigation : userNavigation;

  const userName = isAdminRoute ? "Nguyễn Thị Bình" : "Đỗ Minh Khoa";

  const userDescription = isAdminRoute
    ? "Owner · full workspace access"
    : "Room B-204 account";

  return (
    <div className="flex min-h-svh flex-col bg-page">
      <Header
        variant={headerVariant}
        userName={isSignedInRoute ? userName : undefined}
        onLogin={() => navigate(ROUTES.auth.login)}
        onBackToRooms={() => navigate(ROUTES.guest.rooms)}
        onLogout={() => navigate(ROUTES.guest.rooms, { replace: true })}
        onMenuClick={
          isSignedInRoute ? () => setIsNavigationOpen(true) : undefined
        }
      />

      <div className="flex flex-1 items-stretch">
        {isSignedInRoute ? (
          <div className="hidden w-[214px] shrink-0 md:block">
            <Sidebar
              title={isAdminRoute ? "Owner" : "Tenant"}
              items={navigationItems}
              userName={userName}
              userDescription={userDescription}
            />
          </div>
        ) : null}

        <main className="min-w-0 flex-1" aria-label="Page content">
          <Outlet />
        </main>
      </div>

      <Footer />

      {isSignedInRoute ? (
        <Sheet open={isNavigationOpen} onOpenChange={setIsNavigationOpen}>
          <SheetContent
            side="left"
            className="w-[min(86vw,18rem)] gap-0 border-hairline bg-secondary p-0"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
              <SheetDescription>RentFlow primary navigation</SheetDescription>
            </SheetHeader>

            <Sidebar
              title={isAdminRoute ? "Owner" : "Tenant"}
              items={navigationItems}
              userName={userName}
              userDescription={userDescription}
              className="border-r-0 pt-16"
              onNavigate={() => setIsNavigationOpen(false)}
            />
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  );
}

export default App;
