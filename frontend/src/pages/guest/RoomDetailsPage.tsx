import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { ErrorState, PageLoading } from '@/components/feedback'
import { StatusBadge } from '@/components/status'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from '@/components/ui/icons'
import { getGuestRoomDetail } from '@/shared/api/guest/rooms.api'
import { ROUTES } from '@/router/routes'
import type { GuestRoomDetail } from '@/shared/types/guest/room'
import { formatCurrency } from '@/shared/utils/currencyFormatter'
import { formatDate } from '@/shared/utils/dateFormatter'

function RoomDetailsPage() {
  const { roomId = '' } = useParams()
  const navigate = useNavigate()

  return (
    <Dialog open={Boolean(roomId)} onOpenChange={(open) => {
      if (!open) void navigate(ROUTES.guest.rooms, { replace: true })
    }}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100svh-2rem)] w-[min(1120px,calc(100vw-1.5rem))] max-w-none gap-0 overflow-y-auto rounded-2xl border-hairline bg-field p-0 shadow-2xl sm:max-w-[1120px]"
      >
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-hairline bg-field/95 px-5 py-3 backdrop-blur-sm">
          <span className="text-sm font-medium text-muted-foreground">Room details</span>
          <DialogClose asChild>
            <Button type="button" variant="outline" size="icon" aria-label="Close room details" className="bg-surface"><CloseIcon /></Button>
          </DialogClose>
        </div>
        {roomId ? <RoomDetailsContent key={roomId} roomId={roomId} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function RoomDetailsContent({ roomId }: { roomId: string }) {
  const [room, setRoom] = useState<GuestRoomDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getGuestRoomDetail(roomId, controller.signal)
      .then((detail) => { if (!controller.signal.aborted) { setRoom(detail); setError(false) } })
      .catch(() => { if (!controller.signal.aborted) setError(true) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [roomId, retryKey])

  if (loading) return <div className="p-8"><DialogHeader><DialogTitle>Room details</DialogTitle><DialogDescription>Loading room information</DialogDescription></DialogHeader><PageLoading title="Loading room details" /></div>
  if (error) return <div className="p-8"><DialogHeader><DialogTitle>Room unavailable</DialogTitle><DialogDescription>This room may no longer be public.</DialogDescription></DialogHeader><ErrorState title="Room is unavailable" description="This room may no longer be public or the link may be invalid." onRetry={() => { setLoading(true); setRetryKey((key) => key + 1) }} /></div>
  if (!room) return <div className="p-8"><DialogHeader><DialogTitle>Room not found</DialogTitle><DialogDescription>There is no room at this link.</DialogDescription></DialogHeader></div>

  const occupancy = `${room.maxPeople} ${room.maxPeople === 1 ? 'person' : 'people'}`
  const availableNote = room.availableFrom && room.status === 'available soon'
    ? `Expected available from ${formatDate(room.availableFrom)}.`
    : null

  return (
    <div className="grid items-start gap-6 p-5 sm:p-6 lg:grid-cols-2 lg:gap-8">
      <RoomGallery room={room} />

      <div className="flex min-w-0 flex-col gap-5">
        <DialogHeader className="flex-row items-start justify-between gap-4 space-y-0 text-left">
          <div className="min-w-0">
            <DialogTitle className="text-3xl font-semibold tracking-tight text-foreground">Room {room.roomCode}</DialogTitle>
            <DialogDescription className="mt-1.5 text-sm">Floor {room.floor} · up to {occupancy} · {room.areaName}</DialogDescription>
          </div>
          {availableNote ? <p className="shrink-0 rounded-lg border border-status-warning-fg/25 bg-status-warning-bg px-3.5 py-2.5 text-sm font-medium leading-relaxed text-status-warning-fg">{availableNote}</p> : null}
        </DialogHeader>

        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <p className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">{formatCurrency(room.price)}</p>
          <p className="text-sm text-muted-foreground">/ month · fixed public rent</p>
        </div>

        <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-hairline bg-hairline sm:grid-cols-2">
          <Fact label="Room code" value={room.roomCode} />
          <Fact label="Floor" value={`Floor ${room.floor}`} />
          <Fact label="Fits" value={occupancy} />
          <Fact label="Deposit" value={formatCurrency(room.deposit)} />
        </dl>

        <p className="whitespace-pre-line text-sm leading-6 text-body">{room.roomDetail || 'No description has been added yet.'}</p>
      </div>

      <section className="flex flex-col gap-3 rounded-xl bg-ink p-5 text-page lg:col-span-2">
        <h3 className="text-base font-semibold">Contact the owner directly</h3>
        <p className="max-w-3xl text-sm leading-6 text-page/70">Viewing, deposit and the room agreement happen outside RentFlow. Your account will be provided by the owner after the lease contract is established.</p>
        <div className="flex flex-wrap gap-2">
          {room.contact.adminPhone ? <ContactLink href={`tel:${room.contact.adminPhone}`} primary>{room.contact.adminPhone}</ContactLink> : null}
          {room.contact.adminEmail ? <ContactLink href={`mailto:${room.contact.adminEmail}`}>{room.contact.adminEmail}</ContactLink> : null}
          {room.contact.adminZalo ? <ContactLink href={room.contact.adminZalo} external>Zalo chat</ContactLink> : null}
          {room.contact.adminFacebook ? <ContactLink href={room.contact.adminFacebook} external>Facebook</ContactLink> : null}
        </div>
      </section>
    </div>
  )
}

function RoomGallery({ room }: { room: GuestRoomDetail }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const images = room.images
  const selected = images[selectedIndex]
  const showControls = images.length > 1

  return (
    <section className="flex min-w-0 flex-col gap-2.5" aria-label={`Photos of room ${room.roomCode}`}>
      <div className="relative flex h-[300px] items-center justify-center overflow-hidden rounded-xl border border-hairline bg-secondary sm:h-[360px]">
        {selected ? <img src={selected} alt={`Room ${room.roomCode}, photo ${selectedIndex + 1} of ${images.length}`} className="size-full object-cover" /> : <p className="text-sm text-muted-foreground">No room photos available</p>}
        <StatusBadge domain="room" status={room.status} className="absolute left-3 top-3 shadow-sm" />
        {showControls ? <>
          <Button type="button" variant="secondary" size="icon" aria-label="Previous photo" onClick={() => setSelectedIndex((index) => (index - 1 + images.length) % images.length)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-surface/90 shadow-sm hover:bg-surface"><ChevronLeftIcon /></Button>
          <Button type="button" variant="secondary" size="icon" aria-label="Next photo" onClick={() => setSelectedIndex((index) => (index + 1) % images.length)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-surface/90 shadow-sm hover:bg-surface"><ChevronRightIcon /></Button>
          <span className="absolute bottom-3 right-3 rounded-full bg-ink/75 px-3 py-1 text-xs font-medium text-white">{selectedIndex + 1} / {images.length}</span>
        </> : null}
      </div>
      {showControls ? <div className="grid grid-cols-4 gap-2.5" aria-label="Choose a room photo">
        {images.map((image, index) => <button key={`${image}-${index}`} type="button" aria-label={`Show photo ${index + 1}`} aria-pressed={index === selectedIndex} onClick={() => setSelectedIndex(index)} className={`aspect-[4/3] overflow-hidden rounded-lg border-2 transition-colors ${index === selectedIndex ? 'border-clay' : 'border-hairline hover:border-clay/40'}`}><img src={image} alt="" className="size-full object-cover" /></button>)}
      </div> : null}
    </section>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 bg-surface px-4 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm font-medium text-foreground">{value}</dd>
    </div>
  )
}

function ContactLink({ href, children, primary = false, external = false }: { href: string; children: React.ReactNode; primary?: boolean; external?: boolean }) {
  return <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined} className={`inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors ${primary ? 'bg-clay text-white hover:bg-clay-hover' : 'bg-page/12 text-page hover:bg-page/20'}`}>{children}</a>
}

export { RoomDetailsPage }
