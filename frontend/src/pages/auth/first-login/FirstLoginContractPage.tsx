import { Fragment, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { ErrorState, PageLoading } from '@/components/feedback'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { ROUTES } from '@/router/routes'
import { getContractPreview, submitContract } from '@/shared/api/auth/first-login.api'
import { completeOnboarding } from '@/shared/auth/auth-store'
import type { ContractPreview } from '@/shared/types/first-login'

import { SignaturePad } from './SignaturePad'

function FirstLoginContractPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<ContractPreview | null>(null)
  const [signature, setSignature] = useState<Blob | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isSigning, setIsSigning] = useState(false)

  const loadContract = useCallback(() => {
    getContractPreview()
      .then(setData)
      .catch((error: unknown) =>
        setLoadError(error instanceof Error ? error.message : 'Unable to load contract.'),
      )
  }, [])

  useEffect(loadContract, [loadContract])

  function retry() {
    setLoadError('')
    setData(null)
    loadContract()
  }

  async function sign() {
    if (!signature || !accepted || isSigning) return

    setIsSigning(true)
    setSubmitError('')

    try {
      const result = await submitContract(signature, accepted)
      completeOnboarding(result)
      void navigate(ROUTES.user.dashboard, { replace: true })
    } catch (error: unknown) {
      setSubmitError(
        error instanceof Error ? error.message : 'The contract could not be signed.',
      )
    } finally {
      setIsSigning(false)
    }
  }

  if (loadError && !data) {
    return (
      <PageContainer>
        <ErrorState description={loadError} onRetry={retry} />
      </PageContainer>
    )
  }

  if (!data) {
    return (
      <PageContainer>
        <PageLoading />
      </PageContainer>
    )
  }

  const roomCode = data.room.roomCode ?? '—'
  const paragraphs = data.displayParagraphs ?? [data.displayText ?? data.renderedText]
  const isReady = Boolean(signature) && accepted

  return (
    <PageContainer>
      <div className="mx-auto w-full max-w-5xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-clay">
          First login · Step 2 of 2
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Review and sign your digital contract</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Generated from the property contract template, your information and Room {roomCode}.
        </p>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <article className="max-h-[590px] overflow-y-auto rounded-2xl border border-hairline bg-card p-6 text-body">
            <header className="mb-5 border-b border-hairline pb-4 text-center">
              <h2 className="text-xl font-semibold">ROOM LEASE AGREEMENT</h2>
            </header>
            <div className="space-y-5 text-sm leading-7">
              {paragraphs.map((paragraph, index) => (
                <p key={index} className="m-0">
                  {highlight(paragraph, data.displayBoldValues ?? [])}
                </p>
              ))}
            </div>
          </article>

          <aside className="h-fit space-y-4 rounded-2xl border border-hairline bg-card p-5 lg:sticky lg:top-20">
            <div className="space-y-1.5">
              <h2 className="font-semibold">Tenant signature</h2>
              <p className="text-sm text-muted-foreground">
                Draw your signature inside the box using a mouse, trackpad or finger.
              </p>
            </div>

            <SignaturePad onChange={setSignature} />

            <div className="flex items-center gap-2.5">
              <Checkbox
                id="accept-terms"
                checked={accepted}
                disabled={isSigning}
                onCheckedChange={(checked) => setAccepted(checked === true)}
              />
              <Label htmlFor="accept-terms" className="font-normal">
                I agree to the contract terms.
              </Label>
            </div>

            <p className="text-sm text-muted-foreground">
              {isReady
                ? 'Signing takes you straight into your account.'
                : 'Draw your signature and tick the box to sign.'}
            </p>

            <Button
              type="button"
              className="w-full"
              disabled={!isReady || isSigning}
              onClick={() => {
                setSubmitError('')
                setIsConfirmOpen(true)
              }}
            >
              Sign & enter account
            </Button>
          </aside>
        </div>
      </div>

      <Dialog
        open={isConfirmOpen}
        onOpenChange={(next) => {
          if (!isSigning) setIsConfirmOpen(next)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign this contract?</DialogTitle>
            <DialogDescription>
              Your signature is attached to the lease for Room {roomCode} and the contract
              becomes active. Changes after this go through the owner.
            </DialogDescription>
          </DialogHeader>

          {submitError ? (
            <p role="alert" className="text-sm text-destructive">
              {submitError}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSigning}
              onClick={() => setIsConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" variant="dark" disabled={isSigning} onClick={() => void sign()}>
              {isSigning ? <Spinner /> : null}
              {isSigning ? 'Signing…' : 'Sign & enter account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

function highlight(text: string, values: string[]) {
  const tokens = values.filter(Boolean).sort((a, b) => b.length - a.length)
  const parts: Array<string | { value: string }> = []
  let rest = text

  while (rest) {
    const match = tokens.reduce<{ index: number; token: string }>(
      (best, token) => {
        const index =
          token.length === 1
            ? rest.search(new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`))
            : rest.indexOf(token)
        return index >= 0 && (best.index < 0 || index < best.index) ? { index, token } : best
      },
      { index: -1, token: '' },
    )

    if (match.index < 0) {
      parts.push(rest)
      break
    }
    if (match.index > 0) parts.push(rest.slice(0, match.index))
    parts.push({ value: match.token })
    rest = rest.slice(match.index + match.token.length)
  }

  return parts.map((part, index) =>
    typeof part === 'string' ? (
      <Fragment key={index}>{part}</Fragment>
    ) : (
      <strong key={index} className="font-semibold text-foreground">
        {part.value}
      </strong>
    ),
  )
}

export { FirstLoginContractPage }
