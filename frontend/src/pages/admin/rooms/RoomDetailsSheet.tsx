import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router'

import { ErrorState, PageLoading } from '@/components/feedback'
import { StatusBadge } from '@/components/status'
import { Button } from '@/components/ui/button'
import { ContractAgreement } from '@/components/ui/contract-agreement'
import {
  DetailRow,
  DetailSection,
  Fact,
  FactGrid,
  IdentityHeader,
} from '@/components/ui/detail-sheet'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { KeyIcon } from '@/components/ui/icons'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { RoomsOutletContext } from '@/pages/admin/outlet-context'
import { ROUTES } from '@/router/routes'
import { getAdminContractTemplate } from '@/shared/api/admin/parameters.api'
import { getAdminRoomDetail } from '@/shared/api/admin/rooms.api'
import type {
  ActiveRoomContract,
  AdminRoom,
  AdminRoomDetail,
  RoomTenant,
} from '@/shared/types/admin/room'
import { cn } from '@/shared/utils/cn'
import { formatCurrency } from '@/shared/utils/currencyFormatter'
import { formatDate } from '@/shared/utils/dateFormatter'

function RoomDetailsSheet() {
  const { roomId = '' } = useParams()
  const navigate = useNavigate()
  const { rooms, onPrepareAccount, onEditRoom } =
    useOutletContext<RoomsOutletContext>()
  const room = rooms.find(item => item.roomID === roomId) ?? null

  return (
    <Sheet
      open={room !== null}
      onOpenChange={open => {
        if (!open) void navigate(ROUTES.admin.rooms)
      }}
    >
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
  const [reloadToken, setReloadToken] = useState(0)

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
  }, [room.roomID, reloadToken])

  function retry() {
    setIsLoading(true)
    setError('')
    setReloadToken(token => token + 1)
  }

  return (
    <>
      <SheetHeader className="border-b border-hairline pr-12">
        <div className="flex flex-wrap items-center gap-2.5">
          <SheetTitle className="text-xl">Room {room.roomCode}</SheetTitle>
          <StatusBadge domain="room" status={room.status} />
        </div>
        <SheetDescription>
          {room.areaName} · Floor {room.floor} · up to {room.maxPeople}{' '}
          {room.maxPeople === 1 ? 'person' : 'people'}
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-5 px-4 pb-6">
        {isLoading ? (
          <PageLoading
            title="Loading room details"
            description="Fetching the current operational context..."
          />
        ) : null}

        {error ? <ErrorState description={error} onRetry={retry} /> : null}

        {!isLoading && !error && detail ? (
          <RoomDetailContent
            detail={detail}
            onPrepareAccount={onPrepareAccount}
            onEditRoom={onEditRoom}
          />
        ) : null}
      </div>
    </>
  )
}

function RoomDetailContent({
  detail,
  onPrepareAccount,
  onEditRoom,
}: {
  detail: AdminRoomDetail
  onPrepareAccount: (roomID: string) => void
  onEditRoom: (roomID: string) => void
}) {
  const { room, activeContract, tenant, account } = detail
  const [isContractOpen, setIsContractOpen] = useState(false)

  return (
    <>
      <RoomGallery images={room.images} roomCode={room.roomCode} />

      <DetailSection
        title="Room details"
        bordered={false}
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onEditRoom(room.roomID)}
          >
            Edit room
          </Button>
        }
      >
        <FactGrid>
          <Fact label="Area" value={room.areaName} />
          <Fact label="Floor" value={`Floor ${room.floor}`} />
          <Fact
            label="Fits"
            value={`${room.maxPeople} ${room.maxPeople === 1 ? 'person' : 'people'}`}
          />
          <Fact
            label="Available from"
            value={room.availableFrom ? formatDate(room.availableFrom) : 'Not set'}
          />
          <Fact label="Monthly price" value={formatCurrency(room.price)} />
          <Fact label="Deposit" value={formatCurrency(room.deposit)} />
          <Fact
            label="Description"
            value={room.roomDetail || 'No room description.'}
            className="sm:col-span-2"
          />
        </FactGrid>
      </DetailSection>

      <DetailSection title="Current tenancy">
        {activeContract && tenant ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <IdentityHeader
                name={tenant.fullName}
                fallbackName="Unnamed tenant"
                detail={tenant.phoneNumber || 'No phone number'}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsContractOpen(true)}
              >
                View contract
              </Button>
            </div>

            <div>
              <DetailRow
                label="Lease period"
                value={`${formatOptionalDate(activeContract.startDate)} – ${formatOptionalDate(activeContract.expireDate)}`}
              />
              <DetailRow label="Contract rent" value={formatCurrency(activeContract.rent)} />
              <DetailRow label="Contract deposit" value={formatCurrency(activeContract.deposit)} />
            </div>

            <ContractDialog
              open={isContractOpen}
              onOpenChange={setIsContractOpen}
              contract={activeContract}
              tenant={tenant}
              roomCode={room.roomCode}
            />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No active tenancy.</p>
        )}
      </DetailSection>

      <DetailSection
        title="Room account"
        badge={account ? <StatusBadge domain="account" status={account.status} /> : undefined}
        action={
          account?.status === 'banned' ? (
            <Button
              type="button"
              variant="dark"
              size="sm"
              onClick={() => onPrepareAccount(room.roomID)}
            >
              <KeyIcon />
              Prepare account
            </Button>
          ) : undefined
        }
      >
        {account ? (
          <FactGrid>
            <Fact label="Username" value={account.username} />
            <Fact label="Active since" value={formatOptionalDate(account.startDate)} />
          </FactGrid>
        ) : (
          <p className="text-sm text-muted-foreground">
            No room account. Prepare one to let the tenant sign in.
          </p>
        )}
      </DetailSection>
    </>
  )
}

/** What the owner keeps of the signed lease: the terms and the signature. */
function ContractDialog({
  open,
  onOpenChange,
  contract,
  tenant,
  roomCode,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contract: ActiveRoomContract
  tenant: RoomTenant
  roomCode: string
}) {
  const [template, setTemplate] = useState<string | null>(null)
  const [templateError, setTemplateError] = useState('')

  // The agreement body only matters once the owner asks to read it, so it is
  // fetched on first open rather than with every room.
  useEffect(() => {
    if (!open || template !== null) return

    const controller = new AbortController()
    getAdminContractTemplate(controller.signal)
      .then(setTemplate)
      .catch(() => {
        if (!controller.signal.aborted) {
          setTemplateError('The agreement text could not be loaded.')
        }
      })

    return () => controller.abort()
  }, [open, template])

  const rent = formatCurrency(contract.rent)
  const values: Record<string, string> = {
    fullName: tenant.fullName,
    tenantName: tenant.fullName,
    identityNo: tenant.identityNo,
    placeOfResidence: tenant.por,
    roomCode,
    rent,
    monthlyRent: rent,
    deposit: formatCurrency(contract.deposit),
    startDate: formatOptionalDate(contract.startDate),
    expireDate: formatOptionalDate(contract.expireDate),
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Sits above the drawer it is opened from, whose overlay is already z-50. */}
      <DialogContent className="z-[60] max-h-[80vh] w-[min(46rem,calc(100%-2rem))] max-w-none overflow-y-auto rounded-lg bg-field p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl">Lease agreement</DialogTitle>
          <DialogDescription>
            Room {roomCode} · signed{' '}
            {contract.signedAt ? formatDate(contract.signedAt) : 'not yet'}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4 text-sm leading-6 text-body">
          {templateError ? (
            <p role="alert" className="text-sm text-destructive">
              {templateError}
            </p>
          ) : template === null ? (
            <p className="text-sm text-muted-foreground">Loading the agreement…</p>
          ) : (
            <ContractAgreement template={template} values={values} />
          )}
        </div>

        <div className="mt-6 border-t border-hairline pt-5">
          <p className="text-sm text-muted-foreground">
            Signed by {tenant.fullName} ·{' '}
            {contract.signedAt ? formatDate(contract.signedAt, true) : 'Not signed'}
          </p>
          <SignatureImage src={contract.signature ?? ''} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SignatureImage({ src }: { src: string }) {
  const [hasError, setHasError] = useState(false)

  if (!src || hasError) {
    return (
      <div className="mt-3 flex aspect-[3/1] w-full max-w-sm items-center justify-center rounded-md border border-hairline bg-white text-sm text-muted-foreground">
        Signature image unavailable
      </div>
    )
  }

  return (
    <img
      src={src}
      alt="Tenant signature"
      className="mt-3 aspect-[3/1] w-full max-w-sm rounded-md border border-hairline bg-white object-contain"
      onError={() => setHasError(true)}
    />
  )
}

/**
 * Same picker as the public room page, laid out with the strip beside the
 * frame because the drawer is taller than it is wide.
 */
function RoomGallery({ images, roomCode }: { images: string[]; roomCode: string }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selected = images[selectedIndex]

  if (images.length === 0) {
    return (
      <div className="grid aspect-[8/5] place-items-center rounded-xl border border-dashed border-hairline bg-page text-sm text-muted-foreground">
        No room images yet
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_104px] gap-2.5 sm:grid-cols-[minmax(0,1fr)_118px]">
      <RoomImage
        src={selected}
        alt={`${roomCode}, photo ${selectedIndex + 1} of ${images.length}`}
        className="aspect-[4/3]"
      />

      {/* Equal rows make the strip end exactly where the frame does, whatever
          the image count and however wide the drawer is. */}
      <div className="grid auto-rows-fr gap-2.5" aria-label="Choose a room photo">
        {images.map((image, index) => (
          <button
            key={`${image}-${index}`}
            type="button"
            aria-label={`Show photo ${index + 1}`}
            aria-pressed={index === selectedIndex}
            onClick={() => setSelectedIndex(index)}
            className={cn(
              'overflow-hidden rounded-lg border-2 transition-colors',
              index === selectedIndex
                ? 'border-clay'
                : 'border-hairline hover:border-clay/40',
            )}
          >
            <RoomImage src={image} alt="" className="h-full rounded-none border-0" />
          </button>
        ))}
      </div>
    </div>
  )
}

function RoomImage({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className: string
}) {
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return (
      <div
        className={cn(
          'grid place-items-center rounded-lg border border-hairline bg-page px-3 text-center text-xs text-muted-foreground',
          className,
        )}
      >
        Image unavailable
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn('w-full rounded-lg border border-hairline object-cover', className)}
      onError={() => setHasError(true)}
    />
  )
}

function formatOptionalDate(value?: string | null) {
  return value ? formatDate(value) : 'Not set'
}

export { RoomDetailsSheet }
