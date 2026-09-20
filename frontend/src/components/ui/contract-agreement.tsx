import { Fragment } from 'react'

/**
 * The agreement body is stored once as a parameter, holding {token}
 * placeholders that both the tenant's lease card and the owner's room drawer
 * fill from their own copy of the contract. Filled values are emphasised so
 * the reader can see at a glance what the contract says about this tenancy.
 */
function ContractAgreement({
  template,
  values,
}: {
  template: string
  values: Record<string, string>
}) {
  const paragraphs = template
    .split(/\r?\n\s*\r?\n|\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  if (paragraphs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No contract template has been set up yet.
      </p>
    )
  }

  return (
    <>
      {paragraphs.map((paragraph, paragraphIndex) => (
        <p key={paragraphIndex}>
          {paragraph.split(/(\{\w+\})/g).map((part, partIndex) => {
            const token = /^\{(\w+)\}$/.exec(part)
            const value = token ? values[token[1]] : undefined

            return value ? (
              <strong key={partIndex} className="font-semibold text-foreground">
                {value}
              </strong>
            ) : (
              <Fragment key={partIndex}>{part}</Fragment>
            )
          })}
        </p>
      ))}
    </>
  )
}

export { ContractAgreement }
