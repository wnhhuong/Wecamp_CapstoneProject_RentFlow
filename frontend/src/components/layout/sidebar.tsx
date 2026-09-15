import type { ComponentProps } from 'react'

import { cn } from '@/shared/utils/cn'

interface SidebarNavItem {
  id: string
  label: string
  badge?: string | number
  active?: boolean
  onSelect?: () => void
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
      <nav aria-label={title}>
        <p className="px-2.5 pb-2 text-xs text-muted-foreground">{title}</p>
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2.5 text-left text-[13.5px] font-medium transition-colors',
                  item.active
                    ? 'bg-ink text-page'
                    : 'text-body hover:bg-ink/[0.07] hover:text-ink',
                )}
                aria-current={item.active ? 'page' : undefined}
                onClick={() => {
                  item.onSelect?.()
                  onNavigate?.()
                }}
              >
                <span>{item.label}</span>
                {item.badge !== undefined ? (
                  <span
                    className={cn(
                      'min-w-6 rounded-full px-1.5 py-0.5 text-center text-sm',
                      item.active
                        ? 'bg-page/20 text-page'
                        : 'bg-[#cfc7b6] text-muted-foreground',
                    )}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {userName ? (
        <div className="mt-auto border-t border-[#cfc7b6] px-2.5 pt-4">
          <p className="text-xs text-muted-foreground">Signed in</p>
          <p className="mt-1.5 text-sm font-medium text-foreground">{userName}</p>
          {userDescription ? (
            <p className="mt-1 text-[13px] text-muted-foreground">
              {userDescription}
            </p>
          ) : null}
        </div>
      ) : null}
    </aside>
  )
}

export { Sidebar }
export type { SidebarNavItem, SidebarProps }
