import { apiRequest } from '@/shared/api/client'
import { ENDPOINTS } from '@/shared/api/endpoints'
import type {
  BackendTenantDashboard,
  DashboardElectricity,
  ElectricityReminderState,
  InvoiceBillKey,
  TenantDashboard,
} from '@/shared/types/dashboard'
import { mapRequestType } from '@/shared/utils/requestTypes'
import {
  mapInvoiceStatus,
  mapRequestStatus,
  mapTicketStatus,
} from '@/shared/utils/statusMapper'
import { mapTicketType } from '@/shared/utils/ticketTypes'

const BILL_KEYS: InvoiceBillKey[] = [
  'room',
  'electrical',
  'water',
  'wifi',
  'parking',
  'other',
]

export async function getTenantDashboard(
  signal?: AbortSignal,
): Promise<TenantDashboard> {
  const dashboard = await apiRequest<BackendTenantDashboard>(
    ENDPOINTS.user.dashboard,
    { auth: 'user', signal },
  )

  const invoice = dashboard.currentInvoice

  return {
    invoice: invoice
      ? {
          invoiceID: String(invoice.invoiceID),
          billingPeriod: invoice.billingPeriod ?? '',
          totalBill: invoice.totalBill ?? 0,
          status: mapInvoiceStatus(invoice.status),
          isOverdue: invoice.isOverdue ?? false,
          dueDate: invoice.dueDate,
          breakdown: Object.fromEntries(
            BILL_KEYS.map((key) => [key, invoice.breakdown?.[key] ?? 0]),
          ) as Record<InvoiceBillKey, number>,
        }
      : null,
    electricity: mapElectricity(dashboard.electricityReminder),
    tickets: (dashboard.activeTickets ?? []).map((ticket) => ({
      ticketID: String(ticket.ticketID),
      type: mapTicketType(ticket.ticketType),
      description: ticket.description ?? '',
      status: mapTicketStatus(ticket.status),
      createDate: ticket.createDate,
    })),
    requests: (dashboard.pendingRequests ?? []).map((request) => {
      const requestID = String(request.requestID)

      return {
        requestID,
        displayID: request.displayID ?? requestID,
        type: mapRequestType(request.type),
        createDate: request.createDate,
        status: mapRequestStatus(request.status),
      }
    }),
  }
}

function mapElectricity(
  reminder: BackendTenantDashboard['electricityReminder'],
): DashboardElectricity {
  return {
    state: mapReminderState(reminder?.state),
    startDate: reminder?.startDate ?? '',
    endDate: reminder?.endDate ?? '',
  }
}

function mapReminderState(state?: string): ElectricityReminderState {
  return state === 'submitted' || state === 'not_due' ? state : 'due_not_uploaded'
}
