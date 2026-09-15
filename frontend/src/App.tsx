import { useState } from 'react'

import { Header, Footer, Sidebar, type SidebarNavItem } from '@/components/layout'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

type AppRole = 'guest' | 'user' | 'admin'

const userNavigation: SidebarNavItem[] = [
  { id: 'home', label: 'Home', active: true },
  { id: 'electricity', label: 'Electricity' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'requests', label: 'Requests' },
  { id: 'tickets', label: 'Tickets' },
  { id: 'profile', label: 'Profile & lease' },
]

const adminNavigation: SidebarNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', active: true },
  { id: 'rooms', label: 'Rooms & leases' },
  { id: 'users', label: 'Users' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'tickets', label: 'Tickets' },
  { id: 'approvals', label: 'Approvals' },
]

function App() {
  const [isNavigationOpen, setIsNavigationOpen] = useState(false)

  // Temporary until authentication provides the current account and role.
  const role = 'user' as AppRole
  const isSignedIn = role === 'user' || role === 'admin'
  const isAdmin = role === 'admin'
  const navigationItems = isAdmin ? adminNavigation : userNavigation
  const userName = isAdmin ? 'Nguyễn Thị Bình' : 'Đỗ Minh Khoa'
  const userDescription = isAdmin
    ? 'Owner · full workspace access'
    : 'Room B-204 account'

  return (
    <div className="flex min-h-svh flex-col bg-page">
      <Header
        variant={isSignedIn ? 'signed-in' : 'guest'}
        userName={isSignedIn ? userName : undefined}
        onMenuClick={
          isSignedIn ? () => setIsNavigationOpen(true) : undefined
        }
      />

      <div className="flex flex-1 items-stretch">
        {isSignedIn ? (
          <div className="hidden w-[214px] shrink-0 md:block">
            <Sidebar
              title={isAdmin ? 'Owner' : 'Tenant'}
              items={navigationItems}
              userName={userName}
              userDescription={userDescription}
            />
          </div>
        ) : null}

        <main className="min-w-0 flex-1" aria-label="Page content" />
      </div>

      <Footer />

      {isSignedIn ? (
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
              title={isAdmin ? 'Owner' : 'Tenant'}
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
  )
}

export default App
