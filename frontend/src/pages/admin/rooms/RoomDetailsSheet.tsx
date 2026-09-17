import { useEffect, useState } from 'react'

import { EmptyState, ErrorState, PageLoading } from '@/components/feedback'
import { StatusBadge } from '@/components/status'
import { Button } from '@/components/ui/button'
import { KeyIcon } from '@/components/ui/icons'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { getAdminRoomDetail } from '@/shared/api/admin/rooms.api'
import type { AdminRoom, AdminRoomDetail } from '@/shared/types/admin/room'
import { formatCurrency } from '@/shared/utils/currencyFormatter'
import { formatDate } from '@/shared/utils/dateFormatter'

interface RoomDetailsSheetProps {
  room: AdminRoom | null
  onOpenChange: (open: boolean) => void
  onPrepareAccount: (roomID: string) => void
  onEditRoom: (roomID: string) => void
}

function RoomDetailsSheet({
  room,
  onOpenChange,
  onPrepareAccount,
  onEditRoom,
}: RoomDetailsSheetProps) {
  return (
    <Sheet open={room !== null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        {room ? (
          <RoomDetailsLoader
            key={room.roomID}
            room={room}
            onPrepareAccount={onPrepareAccount}
            onEditRoom={onEditRoom}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function RoomDetailsLoader({
  room,
  onPrepareAccount,
  onEditRoom,
}: {
  room: AdminRoom
  onPrepareAccount: (roomID: string) => void
  onEditRoom: (roomID: string) => void
}) {
  const [detail, setDetail] = useState<AdminRoomDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isActive = true

    getAdminRoomDetail(room.roomID)
      .then((roomDetail) => {
        if (isActive) setDetail(roomDetail)
      })
      .catch((loadError: unknown) => {
        if (!isActive) return
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'The room details could not be loaded.',
        )
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [room.roomID])

  function retry() {
    setIsLoading(true)
    setError('')
    getAdminRoomDetail(room.roomID)
      .then(setDetail)
      .catch((loadError: unknown) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'The room details could not be loaded.',
        )
      })
      .finally(() => setIsLoading(false))
  }

  return (
    <>
      <SheetHeader className="border-b border-hairline pr-12">
        <SheetTitle className="text-xl">
          {detail?.room.roomCode ?? 'Room details'}
        </SheetTitle>
        <SheetDescription>
          Current room, tenancy and account information
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-5 px-4 pb-4">
        {isLoading ? (
          <PageLoading
            title="Loading room details"
            description="Fetching the current operational context..."
          />
        ) : null}

        {error ? <ErrorState description={error} onRetry={retry} /> : null}

        {!isLoading && !error && detail ? (
          <RoomDetailContent detail={detail} summary={room} />
        ) : null}
      </div>

      {detail ? (
        <SheetFooter className="border-t border-hairline">
          <Button type="button" variant="outline" onClick={() => onEditRoom(detail.room.roomID)}>
            Edit room
          </Button>
          {detail.account?.status === 'banned' ? (
            <Button type="button" variant="dark" onClick={() => onPrepareAccount(detail.room.roomID)}>
              <KeyIcon />
              Prepare room account
            </Button>
          ) : null}
        </SheetFooter>
      ) : null}
    </>
  )
}

function RoomDetailContent({
  detail,
  summary,
}: {
  detail: AdminRoomDetail
  summary: AdminRoom
}) {
  const { room, activeContract, tenant, account } = detail

  return (
    <>
      {room.images.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {room.images.map((image, index) => (
            <RoomImage
              key={image}
              src={image}
              alt={`${room.roomCode} view ${index + 1}`}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No room images"
          description="This room does not have any public images yet."
        />
      )}

      <DetailSection title="Room">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">Status</span>
          <StatusBadge domain="room" status={room.status} />
        </div>
        <DetailRow label="Area" value={room.areaName} />
        <DetailRow label="Floor" value={String(room.floor)} />
        <DetailRow label="Capacity" value={`${room.maxPeople} people`} />
        <DetailRow
          label="Electricity"
          value={electricityLabels[summary.electricityState]}
        />
        <DetailRow label="Monthly price" value={formatCurrency(room.price)} />
        <DetailRow label="Deposit" value={formatCurrency(room.deposit)} />
        <DetailRow
          label="Available from"
          value={room.availableFrom ? formatDate(room.availableFrom) : 'Not set'}
        />
        <p className="text-sm leading-6 text-body">
          {room.roomDetail || 'No room description.'}
        </p>
      </DetailSection>

      <DetailSection title="Current tenancy">
        {activeContract && tenant ? (
          <>
            <DetailRow label="Tenant" value={tenant.fullName} />
            <DetailRow label="Phone" value={tenant.phoneNumber || 'Not provided'} />
            <DetailRow
              label="Lease period"
              value={`${formatOptionalDate(activeContract.startDate)} – ${formatOptionalDate(activeContract.expireDate)}`}
            />
            <DetailRow label="Contract rent" value={formatCurrency(activeContract.rent)} />
            <DetailRow label="Contract deposit" value={formatCurrency(activeContract.deposit)} />
            <DetailRow label="Still owed" value={formatCurrency(summary.stillOwed)} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No active tenancy.</p>
        )}
      </DetailSection>

      <DetailSection title="Room account">
        {account ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Status</span>
              <StatusBadge domain="account" status={account.status} />
            </div>
            <DetailRow label="Username" value={account.username} />
            <DetailRow label="Role" value={account.role ?? 'user'} />
            <DetailRow
              label="Start date"
              value={formatOptionalDate(account.startDate)}
            />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No room account.</p>
        )}
      </DetailSection>
    </>
  )
}

function RoomImage({ src, alt }: { src: string; alt: string }) {
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-md border border-hairline bg-page px-4 text-center text-sm text-muted-foreground">
        Image unavailable
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className="aspect-[4/3] w-full rounded-md border border-hairline object-cover"
      onError={() => setHasError(true)}
    />
  )
}

function DetailSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="grid gap-3 border-t border-hairline pt-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  )
}

function formatOptionalDate(value?: string | null) {
  return value ? formatDate(value) : 'Not set'
}

const electricityLabels = {
  checked: 'Checked',
  waiting_admin: 'Waiting for reading',
  late: 'Late',
  not_applicable: 'Not applicable',
} as const

export { RoomDetailsSheet }
