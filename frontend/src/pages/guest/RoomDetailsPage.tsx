import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { EmptyState, ErrorState, PageLoading } from '@/components/feedback'
import { PageContainer } from '@/components/layout'
import { StatusBadge } from '@/components/status'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getGuestRoomDetail } from '@/shared/api/guest/rooms.api'
import { ROUTES } from '@/router/routes'
import type { GuestRoomDetail } from '@/shared/types/guest/room'
import { formatCurrency } from '@/shared/utils/currencyFormatter'
import { formatDate } from '@/shared/utils/dateFormatter'

function RoomDetailsPage() {
  const { roomId } = useParams()
  const [room, setRoom] = useState<GuestRoomDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const load = useCallback(async () => { if (!roomId) { setError(true); setLoading(false); return }; setLoading(true); setError(false); try { setRoom(await getGuestRoomDetail(roomId)) } catch { setError(true) } finally { setLoading(false) } }, [roomId])
  useEffect(() => { void load() }, [load])
  if (loading) return <PageContainer><PageLoading title="Loading room details" /></PageContainer>
  if (error) return <PageContainer><ErrorState title="Room is unavailable" description="This room may no longer be public or the link may be invalid." onRetry={() => void load()} /></PageContainer>
  if (!room) return <PageContainer><EmptyState title="Room not found" /></PageContainer>
  return <PageContainer><Button asChild variant="link" className="w-fit px-0"><Link to={ROUTES.guest.rooms}>← Back to rooms</Link></Button><div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"><main className="flex flex-col gap-6"><div><div className="flex flex-wrap items-center gap-3"><p className="text-sm text-muted-foreground">{room.areaName} · Floor {room.floor}</p><StatusBadge domain="room" status={room.status} /></div><h1 className="mt-2 text-3xl font-semibold">Room {room.roomCode}</h1></div><div className="grid gap-3 sm:grid-cols-2">{(room.images.length ? room.images : [null]).map((image, index) => <div key={image ?? index} className="aspect-[4/3] overflow-hidden rounded-xl border border-hairline bg-secondary">{image ? <img src={image} alt={`Room ${room.roomCode} image ${index + 1}`} className="size-full object-cover" /> : <div className="grid size-full place-items-center text-sm text-muted-foreground">No image available</div>}</div>)}</div><Card><CardHeader><CardTitle>About this room</CardTitle></CardHeader><CardContent><p className="whitespace-pre-line text-sm leading-6 text-body">{room.roomDetail}</p></CardContent></Card></main><aside className="flex flex-col gap-5"><Card><CardHeader><CardTitle>Room information</CardTitle></CardHeader><CardContent className="grid gap-3 text-sm"><Info label="Capacity" value={`Up to ${room.maxPeople} people`} /><Info label="Monthly rent" value={formatCurrency(room.price)} /><Info label="Deposit" value={formatCurrency(room.deposit)} />{room.availableFrom && room.status === 'available soon' ? <Info label="Available from" value={formatDate(room.availableFrom)} /> : null}</CardContent></Card><Card><CardHeader><CardTitle>Contact the owner</CardTitle></CardHeader><CardContent className="flex flex-col gap-2 text-sm">{room.contact.adminPhone ? <a className="text-clay hover:underline" href={`tel:${room.contact.adminPhone}`}>Phone · {room.contact.adminPhone}</a> : null}{room.contact.adminZalo ? <a className="text-clay hover:underline" href={room.contact.adminZalo} target="_blank" rel="noreferrer">Zalo</a> : null}{room.contact.adminEmail ? <a className="text-clay hover:underline" href={`mailto:${room.contact.adminEmail}`}>Email · {room.contact.adminEmail}</a> : null}{room.contact.adminFacebook ? <a className="text-clay hover:underline" href={room.contact.adminFacebook} target="_blank" rel="noreferrer">Facebook</a> : null}</CardContent></Card></aside></div></PageContainer>
}

function Info({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4 border-b border-hairline pb-2 last:border-0 last:pb-0"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div> }
export { RoomDetailsPage }
