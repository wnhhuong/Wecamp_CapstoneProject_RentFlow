import { apiRequest } from '@/shared/api/client'
import { ENDPOINTS } from '@/shared/api/endpoints'
import type {
  ConsumptionContext,
  ConsumptionRequest,
  SubmitConsumptionInput,
} from '@/shared/types/consumption'

export function getConsumptionContext(
  signal?: AbortSignal,
): Promise<ConsumptionContext> {
  return apiRequest<ConsumptionContext>(
    ENDPOINTS.user.consumptionContext,
    { auth: 'user', signal },
  )
}

export function getConsumptionRequest(
  requestID: ConsumptionRequest['requestID'],
  signal?: AbortSignal,
): Promise<ConsumptionRequest> {
  return apiRequest<ConsumptionRequest>(
    ENDPOINTS.user.consumptionRequest(requestID),
    { auth: 'user', signal },
  )
}

export function submitConsumption(
  input: SubmitConsumptionInput,
): Promise<ConsumptionRequest> {
  const body = new FormData()

  body.append('image', input.image)
  body.append('reading', String(input.reading))
  body.append('capturedAt', input.capturedAt)

  return apiRequest<ConsumptionRequest>(
    ENDPOINTS.user.consumptionRequests,
    {
      auth: 'user',
      method: 'POST',
      body,
    },
  )
}
