type ConsumptionID = string | number

export interface ConsumptionContext {
  roomID: ConsumptionID
  roomCode: string
  windowStart: string
  windowEnd: string
  canSubmit: boolean
  electricityUnitPrice: number
  existingRequestID?: ConsumptionID | null
}

export interface SubmitConsumptionInput {
  image: File
  reading: number
  capturedAt: string
}

export interface ConsumptionRequest {
  requestID: ConsumptionID
  type: 'CONSUMP_REQUEST'
  image: string
  reading: number
  previousReading: number
  usage: number
  capturedAt: string
  correspondingCost: number
  status: 'pending' | 'approved'
}