import type { RequestType } from '@/shared/types/request'

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  consump: 'Electricity reading',
  paid: 'Payment notification',
  delay: 'Late payment',
  extend: 'Contract extension',
  moveout: 'Move-out notice',
  checkout: 'Checkout',
}

export const REQUEST_TYPE_OPTIONS = (
  Object.keys(REQUEST_TYPE_LABELS) as RequestType[]
).map((type) => ({ value: type, label: REQUEST_TYPE_LABELS[type] }))

export function mapRequestType(type?: string): RequestType {
  return type && type in REQUEST_TYPE_LABELS
    ? (type as RequestType)
    : 'consump'
}
