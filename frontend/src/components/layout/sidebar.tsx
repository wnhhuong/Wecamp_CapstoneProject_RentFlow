import type { ComponentProps } from 'react'
import { NavLink } from 'react-router'

import { NavigationIcon } from '@/components/ui/navigation-icon'
import { cn } from '@/shared/utils/cn'

interface SidebarNavItem {
  id: string
  label: string
  to: string
  group?: string
  badge?: string | number
  end?: boolean
}

interface SidebarProps extends ComponentProps<'aside'> {
  title: string
  items: SidebarNavItem[]
  userName?: string
  userDescription?: string
  onNavigate?: () => void
}

function Sidebar({
  title,
  items,
  userName,
  userDescription,
  onNavigate,
  className,
  ...props
}: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-full min-h-0 w-full flex-col border-r border-hairline bg-secondary px-3 py-5 text-body',
        className,
      )}
      {...props}
    >
      <nav aria-label={`${title} navigation`} className="min-h-0 flex-1 overflow-y-auto">
        <ul className="flex flex-col gap-1">
          {items.map((item, index) => (
            <li key={item.id}>
              {item.group && (index === 0 || item.group !== items[index - 1].group) ? (
                <p className={cn('px-2.5 pb-1 text-xs font-medium text-muted-foreground', index > 0 && 'pt-4')}>
                  {item.group}
                </p>
              ) : null}
              <NavLink
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                    isActive
                      ? 'bg-ink text-page'
                      : 'text-body hover:bg-ink/[0.07] hover:text-ink',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="flex min-w-0 items-center gap-2.5">
                      <NavigationIcon name={item.id} className="size-4.5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </span>

                    {item.badge !== undefined ? (
                      <span
                        className={cn(
                          'min-w-6 rounded-full px-1.5 py-0.5 text-center text-sm',
                          isActive
                            ? 'bg-page/20 text-page'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {userName ? (
        <div className="mt-4 flex items-center gap-2.5 border-t border-hairline px-2.5 pt-4">
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-page"
          >
            {userName.charAt(0).toUpperCase()}
          </span>

          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {userName}
            </p>

            {userDescription ? (
              <p className="truncate text-sm leading-5 text-muted-foreground">
                {userDescription}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </aside>
  )
}

export { Sidebar }
export type { SidebarNavItem, SidebarProps }
