import { apiRequest } from '@/shared/api/client'
import { ENDPOINTS } from '@/shared/api/endpoints'
import type {
  AdminParameter,
  AdminParameterUpdate,
  BackendAdminParameter,
  BillingParameterName,
  ParameterName,
  PropertyParameterName,
} from '@/shared/types/admin/parameter'

const billingParameterNames = new Set<BillingParameterName>([
  'electricityUnitPrice',
  'waterPrice',
  'wifiFee',
  'parkingFee',
  'otherFees',
  'meterReadingStartDay',
  'meterReadingEndDay',
  'paymentDueDay',
  'yearToExtend',
])

const propertyParameterNames = new Set<PropertyParameterName>([
  'propertyName',
  'address',
  'adminPhone',
  'adminEmail',
  'adminFacebook',
  'adminZalo',
  'bankAccountHolder',
  'bankName',
  'bankAccountNumber',
  'bankQrImage',
])

const allowedParameterNames = new Set<ParameterName>([
  ...billingParameterNames,
  ...propertyParameterNames,
])

/** Numbers behind invoice creation, shown on the Parameters page. */
export function getAdminBillingParameters(): Promise<AdminParameter[]> {
  return getParametersIn(billingParameterNames)
}

/** Property name, address and owner contacts, shown on the Property page. */
export function getAdminPropertyParameters(): Promise<AdminParameter[]> {
  return getParametersIn(propertyParameterNames)
}

async function getParametersIn(
  names: ReadonlySet<ParameterName>,
): Promise<AdminParameter[]> {
  const parameters = await apiRequest<BackendAdminParameter[]>(
    ENDPOINTS.admin.parameters,
    {
      auth: 'admin',
    },
  )

  return parameters
    .filter(isAllowedAdminParameter)
    .filter((parameter) => names.has(parameter.name))
    .map(mapAdminParameter)
}

export async function updateAdminParameters(
  updates: AdminParameterUpdate[],
): Promise<AdminParameter[]> {
  const parameters = await apiRequest<BackendAdminParameter[]>(
    ENDPOINTS.admin.parameters,
    {
      auth: 'admin',
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ updates }),
    },
  )

  return parameters.map((parameter) => {
    if (!isAllowedAdminParameter(parameter)) {
      throw new Error(
        'One of the updated parameters is not supported by this page.',
      )
    }

    return mapAdminParameter(parameter)
  })
}

function isAllowedParameterName(
  name: string,
): name is ParameterName {
  return allowedParameterNames.has(name as ParameterName)
}

function isAllowedAdminParameter(
  parameter: BackendAdminParameter,
): parameter is BackendAdminParameter & { name: ParameterName } {
  return isAllowedParameterName(parameter.name)
}

function mapAdminParameter(
  parameter: BackendAdminParameter & {
    name: ParameterName
  },
): AdminParameter {
  return {
    id: parameter.id,
    name: parameter.name,
    value: parameter.value,
  }
}

/** Replaces the owner's QR image and returns the stored parameter. */
export async function uploadBankQrImage(image: File): Promise<AdminParameter> {
  const body = new FormData()
  body.append('image', image)

  const parameter = await apiRequest<BackendAdminParameter>(
    ENDPOINTS.admin.bankQrImage,
    { auth: 'admin', method: 'POST', body },
  )

  if (!isAllowedAdminParameter(parameter)) {
    throw new Error('The uploaded parameter is not supported by this page.')
  }

  return mapAdminParameter(parameter)
}
