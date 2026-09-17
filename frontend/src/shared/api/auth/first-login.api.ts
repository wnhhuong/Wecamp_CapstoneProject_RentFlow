import { apiRequest } from '@/shared/api/client'
import { ENDPOINTS } from '@/shared/api/endpoints'
import type { ContractPreview, FirstLoginProfileInput, OnboardingResult } from '@/shared/types/first-login'
import type { LoginResult } from '@/shared/types/auth'
import { formatAmount } from '@/shared/utils/currencyFormatter'
import { formatDate } from '@/shared/utils/dateFormatter'

export function submitProfile(input: FirstLoginProfileInput) {
  return apiRequest<OnboardingResult>(ENDPOINTS.auth.firstLogin.profile, { method: 'POST', auth: 'onboarding', body: JSON.stringify(input) })
}

export function getContractPreview() {
  return apiRequest<ContractPreview>(ENDPOINTS.auth.firstLogin.contractPreview, { auth: 'onboarding' }).then((preview) => {
    const user = preview.user
    const room = preview.room
    const roomCode = String(room.roomCode ?? '—')
    const rent = `₫ ${formatAmount(Number(room.price ?? 0))}`
    const deposit = `₫ ${formatAmount(Number(preview.draftContract.propertyDeposit ?? 0))}`
    const values: Record<string, string> = {
      tenantName: String(user.fullName ?? '—'), fullName: String(user.fullName ?? '—'),
      identityNo: String(user.identityNo ?? '—'), placeOfResidence: String(user.PoR ?? user.por ?? '—'), roomCode,
      rent, monthlyRent: rent, deposit,
      startDate: formatDate(preview.draftContract.startDate),
      expireDate: formatDate(preview.draftContract.expireDate),
    }
    const mergedText = preview.renderedText.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? `{${key}}`)
    const displayParagraphs = mergedText.split(/\r?\n\s*\r?\n|\r?\n/).map((paragraph) => paragraph.trim()).filter(Boolean)
    return { ...preview, displayText: mergedText, displayParagraphs, displayBoldValues: Object.values(values).filter((value) => value !== '—') }
  })
}

export function submitContract(signature: Blob, acceptedTerms: boolean) {
  const body = new FormData()
  body.append('signature', signature, 'signature.png')
  body.append('acceptedTerms', String(acceptedTerms))
  return apiRequest<LoginResult>(ENDPOINTS.auth.firstLogin.contract, { method: 'POST', auth: 'onboarding', body })
}

