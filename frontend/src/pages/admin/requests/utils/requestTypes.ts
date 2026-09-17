import type { AdminRequestType } from '@/shared/types/admin/request'

export const REQUEST_TYPE_LABELS: Record<AdminRequestType, string> = {
  consump: 'Electricity reading',
  paid: 'Payment notification',
  delay: 'Late payment',
  extend: 'Contract extension',
  moveout: 'Move-out notice',
  checkout: 'Checkout',
}

export const REQUEST_TYPE_OPTIONS = (
  Object.keys(REQUEST_TYPE_LABELS) as AdminRequestType[]
).map((type) => ({ value: type, label: REQUEST_TYPE_LABELS[type] }))
