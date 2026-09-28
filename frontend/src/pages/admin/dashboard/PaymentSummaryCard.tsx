import type { AdminDashboardPaymentSummary } from '@/shared/types/admin/dashboard'

function formatPercentage(value: number) { return `${Math.round(value)}%` }

function Metric({ label, value, percentage }: { label: string; value: number; percentage: number }) {
  return <div className="rounded-lg border border-hairline p-3"><div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{label}</span><span>{formatPercentage(percentage)}</span></div><div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div></div>
}

function PaymentSummaryCard({ summary, onOpen }: { summary: AdminDashboardPaymentSummary; onOpen: () => void }) {
  const total = summary.paid + summary.notPaid
  const paidPercentage = total ? (summary.paid / total) * 100 : 0
  const notPaidPercentage = total ? (summary.notPaid / total) * 100 : 0
  const overduePercentage = total ? (summary.overdue / total) * 100 : 0

  return <section className="grid gap-4 rounded-xl border border-hairline bg-surface p-5"><button type="button" className="text-left" onClick={onOpen}><h2 className="font-semibold text-foreground">Payment summary</h2><p className="mt-1 text-sm text-muted-foreground">Current invoice collection status</p></button><div className="flex h-4 gap-0.5 overflow-hidden rounded-full bg-muted"><div className="bg-ink" style={{ width: `${paidPercentage}%` }} /><div className="bg-brand" style={{ width: `${notPaidPercentage}%` }} /></div><div className="grid grid-cols-2 gap-2"><Metric label="Paid" value={summary.paid} percentage={paidPercentage} /><Metric label="Not paid" value={summary.notPaid} percentage={notPaidPercentage} /></div><button type="button" onClick={onOpen} className="flex items-center justify-between rounded-lg bg-status-danger-bg px-3.5 py-3 text-left text-status-danger-fg"><span className="text-sm font-medium">Overdue invoices</span><span className="text-right"><strong className="block text-lg tabular-nums">{summary.overdue}</strong><span className="text-xs">{formatPercentage(overduePercentage)}</span></span></button></section>
}

export { PaymentSummaryCard }
