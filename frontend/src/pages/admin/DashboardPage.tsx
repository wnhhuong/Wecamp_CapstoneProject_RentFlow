import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { ErrorState, PageLoading } from '@/components/feedback'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { RefreshIcon } from '@/components/ui/icons'
import { ROUTES } from '@/router/routes'
import { getAdminDashboard } from '@/shared/api/admin/dashboard.api'
import type { AdminDashboardSummary } from '@/shared/types/admin/dashboard'
import { formatDate } from '@/shared/utils/dateFormatter'

import { PaymentSummaryCard } from './dashboard/PaymentSummaryCard'
import { RequestsCard } from './dashboard/RequestsCard'
import { RoomSummaryCard } from './dashboard/RoomSummaryCard'
import { TicketsCard } from './dashboard/TicketsCard'

function DashboardPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<AdminDashboardSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [refreshState, setRefreshState] = useState<'idle' | 'success' | 'error'>('idle')

  async function loadDashboard(isRefresh = false) {
    const controller = new AbortController()
    setIsLoading(true)
    setLoadError('')
    if (isRefresh) setRefreshState('idle')
    try {
      setData(await getAdminDashboard(controller.signal))
      if (isRefresh) setRefreshState('success')
    } catch (error: unknown) {
      if (!controller.signal.aborted) {
        setLoadError(error instanceof Error ? error.message : 'The dashboard could not be loaded.')
        if (isRefresh) setRefreshState('error')
      }
    } finally {
      if (!controller.signal.aborted) setIsLoading(false)
    }
  }

  // The initial request synchronizes the page with the external API.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadDashboard() }, [])

  if (isLoading && !data) return <PageContainer><PageLoading title="Loading dashboard" description="Collecting the latest property information..." /></PageContainer>
  if (loadError && !data) return <PageContainer><ErrorState description={loadError} onRetry={() => void loadDashboard(true)} /></PageContainer>
  if (!data) return null

  return <PageContainer>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-semibold tracking-tight text-foreground">Overview</h1><p className="mt-1.5 text-sm text-muted-foreground">Property snapshot · {formatDate(new Date())}</p></div><Button type="button" variant="outline" onClick={() => void loadDashboard(true)} disabled={isLoading}><RefreshIcon />{isLoading ? 'Refreshing...' : 'Refresh'}</Button></div>
    {loadError ? <ErrorState description={loadError} onRetry={() => void loadDashboard(true)} /> : null}
    {refreshState === 'success' ? <div role="status" className="rounded-md border border-[#bfd2bf] bg-status-success-bg px-4 py-3 text-sm text-status-success-fg">Dashboard refreshed successfully.</div> : null}
    {refreshState === 'error' ? <div role="alert" className="rounded-md border border-[#E5B9AD] bg-[#FBEEEA] px-4 py-3 text-sm text-clay">Dashboard refresh failed. Please try again.</div> : null}
    <div className="grid gap-4 xl:grid-cols-2"><RoomSummaryCard summary={data.roomSummary} onOpen={(status) => navigate(`${ROUTES.admin.rooms}?status=${encodeURIComponent(status)}`)} /><PaymentSummaryCard summary={data.paymentSummary} onOpen={() => navigate(`${ROUTES.admin.invoices}?overdue=true`)} /></div>
    <div className="grid items-start gap-4 xl:grid-cols-2"><RequestsCard requests={data.requestsNeedingApproval} onOpen={() => navigate(`${ROUTES.admin.requests}?status=pending`)} onRequestOpen={(requestID) => navigate(`${ROUTES.admin.requests}?status=pending&request=${encodeURIComponent(requestID)}`)} /><TicketsCard tickets={data.ticketsNeedingAction} onOpen={() => navigate(ROUTES.admin.tickets)} /></div>
  </PageContainer>
}

export { DashboardPage }
