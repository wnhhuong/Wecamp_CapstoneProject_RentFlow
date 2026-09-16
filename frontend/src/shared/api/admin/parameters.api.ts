import { apiRequest } from '@/shared/api/client'
import { ENDPOINTS } from '@/shared/api/endpoints'
import type {
  AdminParameter,
  AdminParameterUpdate,
  BackendAdminParameter,
  ParameterName,
} from '@/shared/types/admin/parameter'

const allowedParameterNames = new Set<ParameterName>([
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

export async function getAdminParameters(): Promise<
  AdminParameter[]
> {
  const parameters = await apiRequest<BackendAdminParameter[]>(
    ENDPOINTS.admin.parameters,
    {
      auth: 'admin',
    },
  )

  return parameters
    .filter(isAllowedAdminParameter)
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
