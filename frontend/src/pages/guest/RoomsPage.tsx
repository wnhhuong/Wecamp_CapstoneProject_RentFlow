import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { EmptyState, ErrorState, PageLoading } from '@/components/feedback'
import { PageContainer } from '@/components/layout'
import { StatusBadge } from '@/components/status'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SearchFilter, type FilterGroup } from '@/components/ui/search-filter'
import { getGuestProperty } from '@/shared/api/guest/parameters.api'
import { getGuestRooms } from '@/shared/api/guest/rooms.api'
import { ROUTES } from '@/router/routes'
import type { GuestProperty, GuestRoom } from '@/shared/types/guest/room'
import { formatCurrency } from '@/shared/utils/currencyFormatter'
import { formatDate } from '@/shared/utils/dateFormatter'

function RoomsPage() {
  const [rooms, setRooms] = useState<GuestRoom[]>([])
  const [property, setProperty] = useState<GuestProperty | null>(null)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<string, string[]>>({})
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, limit: 12, totalItems: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const result = await getGuestRooms({
        search: search.trim() || undefined,
        floor: numberFilter(filters.floor),
        maxPeople: numberFilter(filters.capacity),
        status: statusFilter(filters.availability),
        priceMin: priceFilter(filters.price)?.min,
        priceMax: priceFilter(filters.price)?.max,
        page,
        limit: 12,
      })
      setRooms(result.items)
      setPagination(result.pagination)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [filters, page, search])

  useEffect(() => {
    void Promise.resolve().then(load)
  }, [load])
  useEffect(() => { void getGuestProperty().then(setProperty).catch(() => undefined) }, [])

  const filterGroups: FilterGroup[] = useMemo(() => [
    { id: 'availability', label: 'Availability', selected: filters.availability ?? [], options: [{ value: 'available_now', label: 'Available now' }, { value: 'available_soon', label: 'Available soon' }] },
    { id: 'floor', label: 'Floor', selected: filters.floor ?? [], options: [1, 2, 3, 4].map(value => ({ value: String(value), label: `Floor ${value}` })) },
    { id: 'capacity', label: 'Capacity', selected: filters.capacity ?? [], options: [2, 3, 4].map(value => ({ value: String(value), label: `${value}+ people` })) },
    { id: 'price', label: 'Price', selected: filters.price ?? [], options: [{ value: 'under3500', label: 'Under ₫ 3.500.000' }, { value: '3500to4500', label: '₫ 3.500.000 – 4.500.000' }, { value: 'over4500', label: 'Over ₫ 4.500.000' }] },
  ], [filters])

  function changeFilter(id: string, selected: string[]) { setPage(1); setFilters(current => ({ ...current, [id]: selected })) }
  function clearFilters() { setPage(1); setFilters({}) }

  return <PageContainer>
    <section className="rounded-2xl bg-ink px-6 py-8 text-white sm:px-9">
      <p className="text-xs font-medium uppercase tracking-widest text-flame">Public room catalogue</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl"><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Rooms available at <span className="text-flame">{property?.propertyName ?? 'RentFlow'}</span></h1><p className="mt-3 text-sm leading-6 text-white/70">Browse rooms that are available now or will become available soon. Contact the owner directly for viewing and rental arrangements.</p></div>
        {property ? <div className="text-sm text-white/70"><p>{property.address}</p>{property.contact.adminPhone ? <a className="mt-2 inline-block text-flame" href={`tel:${property.contact.adminPhone}`}>{property.contact.adminPhone}</a> : null}</div> : null}
      </div>
    </section>
    <SearchFilter searchValue={search} onSearchChange={value => { setPage(1); setSearch(value) }} searchPlaceholder="Search room code or description..." searchLabel="Search public rooms" filters={filterGroups} onFilterChange={changeFilter} onClearFilters={clearFilters} resultCount={rooms.length} totalCount={pagination.totalItems} itemNoun="room" />
    {loading ? <PageLoading title="Loading rooms" /> : error ? <ErrorState onRetry={() => void load()} /> : rooms.length === 0 ? <EmptyState title="No public rooms found" description="Try clearing some filters or searching for another room." action={<Button variant="outline" onClick={clearFilters}>Clear filters</Button>} /> : <>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{rooms.map(room => <RoomCard key={room.roomID} room={room} />)}</div>
      {pagination.totalPages > 1 ? <div className="flex items-center justify-center gap-3"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(current => current - 1)}>Previous</Button><span className="text-sm text-muted-foreground">Page {page} of {pagination.totalPages}</span><Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(current => current + 1)}>Next</Button></div> : null}
    </>}
  </PageContainer>
}

function RoomCard({ room }: { room: GuestRoom }) {
  return <Card className="overflow-hidden py-0"><div className="aspect-[16/10] bg-secondary">{room.coverImage ? <img src={room.coverImage} alt={`Room ${room.roomCode}`} className="size-full object-cover" /> : <div className="grid size-full place-items-center text-sm text-muted-foreground">No image available</div>}</div><CardContent className="flex flex-col gap-4 p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">{room.areaName}</p><h2 className="mt-1 text-xl font-semibold">Room {room.roomCode}</h2></div><StatusBadge domain="room" status={room.status} /></div><div className="grid grid-cols-2 gap-2 text-sm text-body"><span>Floor {room.floor}</span><span>Up to {room.maxPeople} people</span><span className="font-semibold text-foreground">{formatCurrency(room.price)} / month</span>{room.availableFrom && room.status === 'available soon' ? <span>From {formatDate(room.availableFrom)}</span> : null}</div><p className="line-clamp-1 min-h-5 text-sm leading-5 text-muted-foreground">{room.roomDetail}</p><Button asChild variant="dark" className="w-full"><Link to={ROUTES.guest.roomDetailsLink(room.roomID)}>View room details</Link></Button></CardContent></Card>
}

function numberFilter(values?: string[]) { return values?.[0] ? Number(values[0]) : undefined }
function statusFilter(values?: string[]) { return values?.[0] as 'available_now' | 'available_soon' | undefined }
function priceFilter(values?: string[]) { switch (values?.[0]) { case 'under3500': return { min: 0, max: 3500000 }; case '3500to4500': return { min: 3500000, max: 4500000 }; case 'over4500': return { min: 4500000 }; default: return undefined } }

export { RoomsPage }
