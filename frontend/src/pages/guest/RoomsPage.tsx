import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Outlet } from 'react-router'

import { EmptyState, ErrorState, PageLoading } from '@/components/feedback'
import { PageContainer } from '@/components/layout'
import { StatusBadge } from '@/components/status'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SearchFilter, type FilterGroup } from '@/components/ui/search-filter'
import { getGuestProperty } from '@/shared/api/guest/parameters.api'
import { getGuestRooms } from '@/shared/api/guest/rooms.api'
import { ROUTES } from '@/router/routes'
import type { GuestProperty, GuestRoom, GuestRoomFilters } from '@/shared/types/guest/room'
import { formatCurrency } from '@/shared/utils/currencyFormatter'
import { formatDate } from '@/shared/utils/dateFormatter'

const HERO_IMAGES = [
  '/login/carousel-1.avif',
  '/login/carousel-2.avif',
  '/login/carousel-3.avif',
]

const PAGE_SIZE = 12
const SEARCH_DEBOUNCE_MS = 300

function RoomsPage() {
  const [rooms, setRooms] = useState<GuestRoom[]>([])
  const [property, setProperty] = useState<GuestProperty | null>(null)
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [filters, setFilters] = useState<Record<string, string[]>>({})
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, totalItems: 0, totalPages: 1 })
  const [totalPublicRooms, setTotalPublicRooms] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  const query = useMemo<GuestRoomFilters>(() => ({
    search: appliedSearch || undefined,
    floor: numberFilter(filters.floor),
    maxPeople: numberFilter(filters.capacity),
    status: statusFilter(filters.availability),
    priceMin: priceFilter(filters.price)?.min,
    priceMax: priceFilter(filters.price)?.max,
    page,
    limit: PAGE_SIZE,
  }), [appliedSearch, filters, page])

  useEffect(() => {
    const timer = window.setTimeout(() => setAppliedSearch(search.trim()), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const controller = new AbortController()
    getGuestRooms(query, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setRooms(result.items)
        setPagination(result.pagination)
        if (!hasActiveRoomFilters(query)) setTotalPublicRooms(result.pagination.totalItems)
        setError(false)
        setLoading(false)
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setError(true)
        setLoading(false)
      })

    return () => controller.abort()
  }, [query, retryKey])

  useEffect(() => {
    const controller = new AbortController()
    getGuestRooms({ page: 1, limit: 1 }, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setTotalPublicRooms(result.pagination.totalItems)
      })
      .catch(() => undefined)
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    getGuestProperty(controller.signal).then(setProperty).catch(() => undefined)
    return () => controller.abort()
  }, [])

  const filterGroups: FilterGroup[] = useMemo(() => [
    { id: 'availability', label: 'Availability', selected: filters.availability ?? [], options: [{ value: 'available_now', label: 'Available now' }, { value: 'available_soon', label: 'Available soon' }] },
    { id: 'floor', label: 'Floor', selected: filters.floor ?? [], options: [1, 2, 3, 4].map(value => ({ value: String(value), label: `Floor ${value}` })) },
    { id: 'capacity', label: 'Capacity', selected: filters.capacity ?? [], options: [2, 3, 4].map(value => ({ value: String(value), label: `${value}+ people` })) },
    { id: 'price', label: 'Price', selected: filters.price ?? [], options: [{ value: 'under3500', label: 'Under ₫ 3.500.000' }, { value: '3500to4500', label: '₫ 3.500.000 – 4.500.000' }, { value: 'over4500', label: 'Over ₫ 4.500.000' }] },
  ], [filters])

  const changeFilter = useCallback((id: string, selected: string[]) => {
    setPage(1)
    setFilters((current) => ({ ...current, [id]: selected }))
  }, [])
  const clearFilters = useCallback(() => {
    setPage(1)
    setFilters({})
  }, [])

  return (
    <>
      <Hero property={property} />

      <PageContainer className="max-w-none gap-6 px-3 py-5 sm:px-5 lg:px-6">
        <SearchFilter
          searchValue={search}
          onSearchChange={(value) => { setPage(1); setSearch(value) }}
          searchPlaceholder="Search room code or description..."
          searchLabel="Search public rooms"
          filters={filterGroups}
          onFilterChange={changeFilter}
          onClearFilters={clearFilters}
          resultCount={pagination.totalItems}
          totalCount={totalPublicRooms ?? undefined}
          itemNoun="room"
        />

        {loading && rooms.length === 0 ? <PageLoading title="Loading rooms" /> : null}
        {error ? <ErrorState onRetry={() => { setLoading(true); setError(false); setRetryKey((key) => key + 1) }} /> : null}
        {!loading && !error && rooms.length === 0 ? <EmptyState title="No public rooms found" description="Try clearing some filters or searching for another room." action={<Button variant="outline" onClick={clearFilters}>Clear filters</Button>} /> : null}

        {rooms.length > 0 && !error ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" aria-busy={loading}>
            {rooms.map((room) => <RoomCard key={room.roomID} room={room} />)}
          </div>
        ) : null}

        {pagination.totalPages > 1 && !error ? (
          <div className="flex items-center justify-center gap-3 py-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
            <span className="text-sm text-muted-foreground">Page {page} of {pagination.totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button>
          </div>
        ) : null}
        <Outlet />
      </PageContainer>
    </>
  )
}

function Hero({ property }: { property: GuestProperty | null }) {
  const [activeImage, setActiveImage] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => setActiveImage((index) => (index + 1) % HERO_IMAGES.length), 7000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <section className="relative isolate overflow-hidden bg-ink px-3 py-6 text-white sm:px-5 sm:py-7 lg:px-6" aria-label="Available rooms">
      {HERO_IMAGES.map((image, index) => (
        <div
          key={image}
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 -z-20 bg-cover bg-center transition-opacity duration-1000 ${index === activeImage ? 'opacity-40' : 'opacity-0'}`}
          style={{ backgroundImage: `url(${image})` }}
        />
      ))}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/90 to-ink/65" />
      <div className="relative grid items-center gap-5 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl xl:text-4xl">Rooms available at <span className="text-highlight">{property?.propertyName ?? 'RentFlow'}</span></h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">Fixed public rent, no agency fee. Deposit and room agreement are arranged directly with the owner — RentFlow does not take payments before a lease exists.</p>
        </div>
        {property ? <div className="lg:min-w-64 self-baseline-last"><p className="mb-2 text-sm text-white/65">Contact the owner</p><div className="flex flex-wrap gap-2">
          {property.contact.adminPhone ? <a className="inline-flex min-h-10 items-center rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-hover" href={`tel:${property.contact.adminPhone}`}>Phone · {property.contact.adminPhone}</a> : null}
          {property.contact.adminZalo ? <a className="inline-flex min-h-10 items-center rounded-lg bg-white/15 px-4 text-sm font-medium text-white transition-colors hover:bg-white/25" href={property.contact.adminZalo} target="_blank" rel="noreferrer">Zalo</a> : null}
          {property.contact.adminEmail ? <a className="inline-flex min-h-10 items-center rounded-lg bg-white/15 px-4 text-sm font-medium text-white transition-colors hover:bg-white/25" href={`mailto:${property.contact.adminEmail}`}>Email</a> : null}
        </div></div> : null}
      </div>
      <div className="relative mt-5 flex items-center gap-2" aria-label="Hero images">
        {HERO_IMAGES.map((image, index) => <button key={image} type="button" aria-label={`Show background image ${index + 1}`} aria-current={index === activeImage ? 'true' : undefined} onClick={() => setActiveImage(index)} className="group grid min-h-7 place-items-center"><span className={`h-1 rounded-full transition-all ${index === activeImage ? 'w-8 bg-highlight' : 'w-4 bg-white/45 group-hover:bg-white/75'}`} /></button>)}
      </div>
    </section>
  )
}

function RoomCard({ room }: { room: GuestRoom }) {
  return (
    <Card className="group relative gap-0 overflow-hidden rounded-2xl border-hairline bg-surface py-0 shadow-sm transition-shadow hover:shadow-lg">
      <div className="relative aspect-[16/10] overflow-hidden bg-secondary">
        {room.coverImage ? <img src={room.coverImage} alt={`Room ${room.roomCode}`} className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" /> : <div className="grid size-full place-items-center text-sm text-muted-foreground">No image available</div>}
        <StatusBadge domain="room" status={room.status} className="absolute left-4 top-4" />
      </div>
      <CardContent className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">{room.roomCode}</h2>
          <p className="shrink-0 text-lg font-semibold tabular-nums text-foreground">{formatCurrency(room.price)}</p>
        </div>
        <p className="text-sm text-muted-foreground">{room.areaName} · Floor {room.floor} · up to {room.maxPeople} {room.maxPeople === 1 ? 'person' : 'people'}</p>
        <p className="line-clamp-2 min-h-10 text-sm leading-5 text-body">{room.roomDetail || 'Room information is available in the details.'}</p>
        {room.availableFrom && room.status === 'available soon' ? <p className="text-xs text-muted-foreground">Available from {formatDate(room.availableFrom)}</p> : null}
        <Button asChild variant="dark" className="mt-auto w-full">
          <Link to={ROUTES.guest.roomDetailsLink(room.roomID)} className="after:absolute after:inset-0 after:content-['']">
            View room details
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function numberFilter(values?: string[]) { return values?.[0] ? Number(values[0]) : undefined }
function hasActiveRoomFilters({ search, floor, status, maxPeople, priceMin, priceMax }: GuestRoomFilters) {
  return Boolean(search || floor !== undefined || status || maxPeople !== undefined || priceMin !== undefined || priceMax !== undefined)
}
function statusFilter(values?: string[]) { return values?.[0] as 'available_now' | 'available_soon' | undefined }
function priceFilter(values?: string[]) { switch (values?.[0]) { case 'under3500': return { min: 0, max: 3500000 }; case '3500to4500': return { min: 3500000, max: 4500000 }; case 'over4500': return { min: 4500000 }; default: return undefined } }

export { RoomsPage }
