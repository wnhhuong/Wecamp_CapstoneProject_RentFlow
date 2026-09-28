import { NavigationIcon } from '@/components/ui/navigation-icon'

/** Visual identity for a record; its enclosing row keeps the original action. */
function RecordLabel({ children, kind }: { children: React.ReactNode; kind: string }) {
  return <span className="inline-flex items-center gap-2.5 font-medium text-foreground"><span className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-page text-muted-foreground"><NavigationIcon name={kind} className="size-4" /></span>{children}</span>
}

function PersonLabel({ name }: { name: string }) {
  return <span className="inline-flex items-center gap-2.5"><span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-primary">{name.trim().charAt(0).toUpperCase() || '—'}</span><span className="font-medium text-foreground">{name}</span></span>
}

export { RecordLabel, PersonLabel }
