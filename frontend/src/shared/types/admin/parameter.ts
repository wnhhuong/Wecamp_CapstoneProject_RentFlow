export type ParameterName =
  | 'electricityUnitPrice'
  | 'waterPrice'
  | 'wifiFee'
  | 'parkingFee'
  | 'otherFees'
  | 'meterReadingStartDay'
  | 'meterReadingEndDay'
  | 'paymentDueDay'
  | 'yearToExtend'

export interface AdminParameter {
  id: string
  name: ParameterName
  value: string
}

export interface BackendAdminParameter {
  id: string
  name: string
  value: string
}

export interface AdminParameterUpdate {
  parameterID: string
  value: string
}