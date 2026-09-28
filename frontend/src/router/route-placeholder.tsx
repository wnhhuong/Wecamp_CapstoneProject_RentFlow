interface RoutePlaceholderProps {
  title: string
}

function RoutePlaceholder({ title }: RoutePlaceholderProps) {
  return (
    <section className="p-5 sm:p-8">
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
    </section>
  )
}

export { RoutePlaceholder }