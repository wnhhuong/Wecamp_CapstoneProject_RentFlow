/** Numbers that feed invoice creation and the billing cycle. */
export type BillingParameterName =
  | 'electricityUnitPrice'
  | 'waterPrice'
  | 'wifiFee'
  | 'parkingFee'
  | 'otherFees'
  | 'meterReadingStartDay'
  | 'meterReadingEndDay'
  | 'paymentDueDay'
  | 'yearToExtend'

/** Free text about the property itself and how to reach its owner. */
export type PropertyParameterName =
  | 'propertyName'
  | 'address'
  | 'adminPhone'
  | 'adminEmail'
  | 'adminFacebook'
  | 'adminZalo'

export type ParameterName = BillingParameterName | PropertyParameterName

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