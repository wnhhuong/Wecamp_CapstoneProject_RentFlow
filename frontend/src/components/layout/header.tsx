import type { ComponentProps } from 'react'

import { Button } from '@/components/ui/button'
import { LogoutIcon, MenuIcon } from '@/components/ui/icons'
import { cn } from '@/shared/utils/cn'

type HeaderVariant = 'guest' | 'auth' | 'signed-in'

interface HeaderProps extends ComponentProps<'header'> {
  variant?: HeaderVariant
  /** From the property parameters; the block is hidden until they load. */
  propertyName?: string
  propertyMeta?: string
  userName?: string
  userInitial?: string
  onLogin?: () => void
  onLogout?: () => void
  onMenuClick?: () => void
}

function Header({
  variant = 'guest',
  propertyName,
  propertyMeta,
  userName,
  userInitial,
  onLogin,
  onLogout,
  onMenuClick,
  className,
  ...props
}: HeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex min-h-16 items-center justify-between gap-4 bg-ink px-4 py-3 text-page sm:px-5',
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        {onMenuClick ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="-ml-2 text-page hover:bg-white/10 hover:text-page md:hidden"
            aria-label="Open navigation"
            onClick={onMenuClick}
          >
            <MenuIcon className="size-5" />
          </Button>
        ) : null}

        <div className="flex shrink-0 items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-[7px] bg-highlight text-[18px] font-semibold text-ink">
            R
          </span>
          <span className="text-lg font-semibold tracking-[-0.01em]">
            RentFlow
          </span>
        </div>

        {propertyName ? (
          <>
            <span className="hidden h-6 w-px bg-page/20 sm:block" />

            <div className="hidden min-w-0 flex-col gap-0.5 sm:flex">
              <span className="truncate text-sm font-medium">
                {propertyName}
              </span>
              {propertyMeta ? (
                <span className="truncate text-xs text-page/55">
                  {propertyMeta}
                </span>
              ) : null}
            </div>
          </>
        ) : null}
      </div>

      {variant === 'guest' ? (
        <Button type="button" size="sm" onClick={onLogin}>
          Log in
        </Button>
      ) : null}

      {variant === 'signed-in' ? (
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-page text-[18px] font-semibold text-ink">
            {userInitial ?? userName?.charAt(0).toUpperCase() ?? 'U'}
          </span>
          {userName ? (
            <span className="hidden max-w-40 truncate text-sm font-medium sm:block">
              {userName}
            </span>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            aria-label="Log out"
            title="Log out"
            className="border-2 border-page/25 bg-transparent text-page hover:bg-white/10 hover:text-page"
            onClick={onLogout}
          >
            <LogoutIcon className="size-4" />
          </Button>
        </div>
      ) : null}
    </header>
  )
}

export { Header }
export type { HeaderProps, HeaderVariant }
