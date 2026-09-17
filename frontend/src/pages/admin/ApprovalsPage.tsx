
import { useEffect, useMemo, useState } from 'react'

import { EmptyState, ErrorState, PageLoading } from '@/components/feedback'
import { PageContainer } from '@/components/layout'
import { StatusBadge } from '@/components/status'
import { Button } from '@/components/ui/button'
import { CloseIcon, RefreshIcon } from '@/components/ui/icons'
import { SearchFilter } from '@/components/ui/search-filter'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  approveAdminConsumptionRequest,
  getAdminConsumptionRequests,
} from '@/shared/api/admin/requests.api'
import type { AdminConsumptionRequest } from '@/shared/types/admin/request'
import { formatDate } from '@/shared/utils/dateFormatter'

const STATUS_FILTER_ID = 'status'

function ApprovalsPage() {
  const [requests, setRequests] = useState<AdminConsumptionRequest[]>([])
  const [selectedRequestID, setSelectedRequestID] = useState<string | null>(null)
  const [filters, setFilters] = useState<Record<string, string[]>>({
    [STATUS_FILTER_ID]: ['pending'],
  })
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isApproving, setIsApproving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  async function loadRequests() {
    setIsLoading(true)
    setLoadError('')

    try {
      const loadedRequests = await getAdminConsumptionRequests()
      setRequests(loadedRequests)
      setSelectedRequestID((current) => {
        if (current && loadedRequests.some((request) => request.requestID === current)) {
          return current
        }

        return loadedRequests.find((request) => request.status === 'pending')?.requestID ??
          loadedRequests[0]?.requestID ??
          null
      })
    } catch {
      setLoadError('Consumption approval requests could not be loaded.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isActive = true

    getAdminConsumptionRequests()
      .then((loadedRequests) => {
        if (!isActive) return
        setRequests(loadedRequests)
        setSelectedRequestID(
          loadedRequests.find((request) => request.status === 'pending')?.requestID ??
            loadedRequests[0]?.requestID ??
            null,
        )
      })
      .catch(() => {
        if (isActive) setLoadError('Consumption approval requests could not be loaded.')
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [])

  const filteredRequests = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return requests.filter((request) => {
      const selectedStatuses = filters[STATUS_FILTER_ID] ?? []
      const matchesStatus =
        selectedStatuses.length === 0 ||
        selectedStatuses.includes(request.status)
      const matchesSearch =
        !normalizedSearch ||
        request.roomCode.toLowerCase().includes(normalizedSearch) ||
        request.tenantName.toLowerCase().includes(normalizedSearch)

      return matchesStatus && matchesSearch
    })
  }, [filters, requests, search])

  const selectedRequest =
    filteredRequests.find(
      (request) => request.requestID === selectedRequestID,
    ) ??
    filteredRequests[0] ??
    null

  const pendingCount = requests.filter(
    (request) => request.status === 'pending',
  ).length
  const approvedCount = requests.filter(
    (request) => request.status === 'approved',
  ).length

  async function handleApprove() {
    if (!selectedRequest || selectedRequest.status !== 'pending') return

    setIsApproving(true)
    setActionError('')
    setSuccessMessage('')

    try {
      const result = await approveAdminConsumptionRequest(
        selectedRequest.requestID,
      )

      setRequests((current) =>
        current.map((request) =>
          request.requestID === result.request.requestID
            ? result.request
            : request,
        ),
      )
      setSelectedRequestID(result.request.requestID)
      setSuccessMessage(
        `${result.request.roomCode} was approved. Invoice ${result.invoice.invoiceID} was created as NOT PAID and is due on ${formatDate(result.invoice.dueDate)}.`,
      )
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'The consumption request could not be approved.',
      )
    } finally {
      setIsApproving(false)
    }
  }

  return (
    <PageContainer>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">
            Consumption approvals
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {pendingCount} pending · {approvedCount} approved · approval creates
            an invoice immediately
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => void loadRequests()}
          disabled={isLoading || isApproving}
        >
          <RefreshIcon />
          Refresh
        </Button>
      </div>

      {successMessage ? (
        <Alert tone="success" onDismiss={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      ) : null}

      {actionError ? (
        <Alert tone="danger" onDismiss={() => setActionError('')}>
          {actionError}
        </Alert>
      ) : null}

      {isLoading ? (
        <PageLoading
          title="Loading approval queue"
          description="Preparing consumption requests for review..."
        />
      ) : null}

      {loadError ? (
        <ErrorState
          description={loadError}
          onRetry={() => void loadRequests()}
        />
      ) : null}

      {!isLoading && !loadError && requests.length === 0 ? (
        <EmptyState
          title="No consumption requests"
          description="Consumption requests submitted by tenants will appear here."
        />
      ) : null}

      {!isLoading && !loadError && requests.length > 0 ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_25rem]">
          <div className="min-w-0 rounded-lg border border-hairline bg-surface">
            <SearchFilter
              className="p-3"
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search by room or tenant..."
              searchLabel="Search consumption approvals"
              filters={[
                {
                  id: STATUS_FILTER_ID,
                  label: 'Status',
                  selected: filters[STATUS_FILTER_ID] ?? [],
                  options: [
                    { value: 'pending', label: 'Pending' },
                    { value: 'approved', label: 'Approved' },
                  ],
                },
              ]}
              onFilterChange={(id, selected) =>
                setFilters((current) => ({ ...current, [id]: selected }))
              }
              onClearFilters={() => setFilters({ [STATUS_FILTER_ID]: [] })}
              resultCount={filteredRequests.length}
              totalCount={requests.length}
              itemNoun="request"
            />

            {filteredRequests.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Room</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reading</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Captured</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow
                      key={request.requestID}
                      data-state={
                        selectedRequest?.requestID === request.requestID
                          ? 'selected'
                          : undefined
                      }
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedRequestID(request.requestID)
                        setActionError('')
                        setSuccessMessage('')
                      }}
                    >
                      <TableCell className="font-medium text-foreground">
                        {request.roomCode}
                      </TableCell>
                      <TableCell>{request.tenantName}</TableCell>
                      <TableCell>
                        <StatusBadge domain="request" status={request.status} />
                      </TableCell>
                      <TableCell>{request.currentReading} kWh</TableCell>
                      <TableCell>{formatReading(request.usage)}</TableCell>
                      <TableCell>{formatDate(request.capturedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="px-4 py-10">
                <EmptyState
                  title="No matching requests"
                  description="Adjust the filters to review another request."
                />
              </div>
            )}
          </div>

          <ApprovalDetails
            request={selectedRequest}
            isApproving={isApproving}
            onApprove={() => void handleApprove()}
          />
        </div>
      ) : null}
    </PageContainer>
  )
}

function ApprovalDetails({
  request,
  isApproving,
  onApprove,
}: {
  request: AdminConsumptionRequest | null
  isApproving: boolean
  onApprove: () => void
}) {
  if (!request) {
    return (
      <aside className="rounded-lg border border-hairline bg-surface p-4">
        <EmptyState
          title="Select a request"
          description="Choose a consumption request to review its reading."
        />
      </aside>
    )
  }

  const isPending = request.status === 'pending'

  return (
    <aside className="flex flex-col gap-4 rounded-lg border border-hairline bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {request.roomCode}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {request.tenantName} · {request.billingPeriod}
          </p>
        </div>
        <StatusBadge domain="request" status={request.status} />
      </div>

      {request.meterImage ? (
        <img
          src={request.meterImage}
          alt={`Meter reading submitted for room ${request.roomCode}`}
          className="aspect-[4/3] w-full rounded-md border border-hairline object-cover"
        />
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center rounded-md border border-hairline bg-page text-sm text-muted-foreground">
          No meter image returned
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <Metric label="Previous" value={formatReading(request.previousReading)} />
        <Metric label="Current" value={formatReading(request.currentReading)} />
        <Metric label="Usage" value={formatReading(request.usage)} strong />
      </div>

      <div className="grid gap-2 text-sm">
        <DetailRow label="Submitted" value={formatDate(request.createDate, true)} />
        <DetailRow label="Captured" value={formatDate(request.capturedAt, true)} />
        <DetailRow
          label="Resolved"
          value={request.resolveDate ? formatDate(request.resolveDate, true) : 'Not yet'}
        />
        <DetailRow
          label="Payment due"
          value={`${formatDate(request.invoiceDueDate)} · overdue after this date`}
        />
      </div>

      <div className="rounded-md border border-[#c7d3e5] bg-status-info-bg px-3 py-2 text-sm text-status-info-fg">
        Approval records the consumption and creates a NOT PAID invoice
        immediately. The invoice becomes overdue after day 05 of the next month.
      </div>

      <Button
        type="button"
        variant="dark"
        disabled={!isPending || isApproving}
        onClick={onApprove}
      >
        {isApproving ? <Spinner /> : null}
        {isPending ? 'Approve and create invoice' : 'Invoice created'}
      </Button>
    </aside>
  )
}

function Alert({
  tone,
  children,
  onDismiss,
}: {
  tone: 'success' | 'danger'
  children: React.ReactNode
  onDismiss: () => void
}) {
  const className =
    tone === 'success'
      ? 'border-[#bfd2bf] bg-status-success-bg text-status-success-fg'
      : 'border-[#e0c2bc] bg-status-danger-bg text-status-danger-fg'

  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={`flex items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm ${className}`}
    >
      <span>{children}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Dismiss message"
        className="text-current hover:bg-black/5"
        onClick={onDismiss}
      >
        <CloseIcon />
      </Button>
    </div>
  )
}

function Metric({
  label,
  value,
  strong,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className="rounded-md border border-hairline bg-page px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-sm font-semibold ${
          strong ? 'text-status-success-fg' : 'text-foreground'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-t border-hairline pt-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  )
}

function formatReading(value: number) {
  return `${value} kWh`
}

export { ApprovalsPage }
