import { useEffect, useMemo, useState } from 'react'

import { EmptyState, ErrorState, PageLoading } from '@/components/feedback'
import { Button } from '@/components/ui/button'
import { CloseIcon } from '@/components/ui/icons'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import {
  getAdminParameters,
  updateAdminParameter,
  type AdminParameter,
  type ParameterName,
} from '@/shared/api/admin/parameters.api'

type FormValues = Record<ParameterName, string>
type FormErrors = Partial<Record<ParameterName, string>>

interface ParameterConfig {
  name: ParameterName
  label: string
  description: string
  unit: string
  min: number
  max?: number
  step: number
  integer?: boolean
  group: 'fees' | 'cycle'
}

const parameterConfigs: ParameterConfig[] = [
  {
    name: 'electricityUnitPrice',
    label: 'Electricity unit price',
    description: 'Applied to electricity consumption in new invoices.',
    unit: 'VND / kWh',
    min: 0,
    step: 100,
    group: 'fees',
  },
  {
    name: 'waterPrice',
    label: 'Water fee',
    description: 'Default water charge used when creating new invoices.',
    unit: 'VND',
    min: 0,
    step: 1000,
    group: 'fees',
  },
  {
    name: 'wifiFee',
    label: 'WiFi fee',
    description: 'Default WiFi charge used when creating new invoices.',
    unit: 'VND',
    min: 0,
    step: 1000,
    group: 'fees',
  },
  {
    name: 'parkingFee',
    label: 'Parking fee',
    description: 'Default parking charge used when creating new invoices.',
    unit: 'VND',
    min: 0,
    step: 1000,
    group: 'fees',
  },
  {
    name: 'otherFees',
    label: 'Other fee',
    description: 'Default extra charge used when creating new invoices.',
    unit: 'VND',
    min: 0,
    step: 1000,
    group: 'fees',
  },
  {
    name: 'meterReadingStartDay',
    label: 'Meter reading start date',
    description: 'Day of month when meter readings can begin.',
    unit: 'Day',
    min: 1,
    max: 31,
    step: 1,
    integer: true,
    group: 'cycle',
  },
  {
    name: 'meterReadingEndDay',
    label: 'Meter reading end date',
    description: 'Day of month when meter readings should end.',
    unit: 'Day',
    min: 1,
    max: 31,
    step: 1,
    integer: true,
    group: 'cycle',
  },
  {
    name: 'paymentDueDay',
    label: 'Payment due date',
    description: 'Day of month used as the default due date for new invoices.',
    unit: 'Day',
    min: 1,
    max: 31,
    step: 1,
    integer: true,
    group: 'cycle',
  },
  {
    name: 'yearToExtend',
    label: 'Contract duration',
    description: 'Default duration used for newly created contracts.',
    unit: 'Year',
    min: 1,
    step: 1,
    integer: true,
    group: 'cycle',
  },
]

function ParametersPage() {
  const [parameters, setParameters] = useState<AdminParameter[]>([])
  const [values, setValues] = useState<Partial<FormValues>>({})
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')

  async function loadParameters() {
    setIsLoading(true)
    setLoadError('')

    try {
      const loadedParameters = await getAdminParameters()
      setParameters(loadedParameters)
      setValues(toFormValues(loadedParameters))
      setErrors({})
      setSaveError('')
      setSaveMessage('')
    } catch {
      setLoadError('The billing parameters could not be loaded.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isActive = true

    getAdminParameters()
      .then((loadedParameters) => {
        if (!isActive) return
        setParameters(loadedParameters)
        setValues(toFormValues(loadedParameters))
      })
      .catch(() => {
        if (isActive) setLoadError('The billing parameters could not be loaded.')
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [])

  const parameterByName = useMemo(() => {
    return new Map(parameters.map((parameter) => [parameter.name, parameter]))
  }, [parameters])

  const changedParameters = useMemo(() => {
    return parameterConfigs.filter((config) => {
      const parameter = parameterByName.get(config.name)
      return parameter && values[config.name] !== parameter.value
    })
  }, [parameterByName, values])

  function updateValue(name: ParameterName, value: string) {
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    setSaveError('')
    setSaveMessage('')
  }

  async function handleSave() {
    const nextErrors = validateParameters(values)

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      setSaveError('Please fix the highlighted parameters before saving.')
      return
    }

    const updates = changedParameters
      .map((config) => {
        const parameter = parameterByName.get(config.name)
        return parameter
          ? { parameterID: parameter.id, name: config.name, value: values[config.name] ?? '' }
          : null
      })
      .filter((update): update is { parameterID: string; name: ParameterName; value: string } =>
        update !== null,
      )

    if (updates.length === 0) return

    setIsSaving(true)
    setSaveError('')
    setSaveMessage('')

    try {
      const updatedParameters = await Promise.all(
        updates.map((update) =>
          updateAdminParameter(update.parameterID, update.value.trim()),
        ),
      )

      setParameters((current) =>
        current.map((parameter) => {
          const updatedParameter = updatedParameters.find(
            (candidate) => candidate.name === parameter.name,
          )

          return updatedParameter ?? parameter
        }),
      )
      setValues((current) => ({
        ...current,
        ...toFormValues(updatedParameters),
      }))
      setErrors({})
      setSaveMessage('Billing parameters were saved successfully.')
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : 'The billing parameters could not be saved.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  function handleReset() {
    setValues(toFormValues(parameters))
    setErrors({})
    setSaveError('')
    setSaveMessage('')
  }

  const feeConfigs = parameterConfigs.filter((config) => config.group === 'fees')
  const cycleConfigs = parameterConfigs.filter(
    (config) => config.group === 'cycle',
  )

  return (
    <section className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">
            Billing parameters
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Current-period values for new contracts and invoices.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={isSaving || changedParameters.length === 0}
          >
            Reset
          </Button>
          <Button
            type="button"
            variant="dark"
            onClick={() => void handleSave()}
            disabled={isSaving || changedParameters.length === 0}
          >
            {isSaving ? <Spinner /> : null}
            {isSaving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </div>

      {saveMessage ? (
        <Alert tone="success" onDismiss={() => setSaveMessage('')}>
          {saveMessage}
        </Alert>
      ) : null}

      {saveError ? (
        <Alert tone="danger" onDismiss={() => setSaveError('')}>
          {saveError}
        </Alert>
      ) : null}

      {isLoading ? (
        <PageLoading
          title="Loading parameters"
          description="Preparing current billing settings..."
        />
      ) : null}

      {loadError ? (
        <ErrorState
          description={loadError}
          onRetry={() => void loadParameters()}
        />
      ) : null}

      {!isLoading && !loadError && parameters.length === 0 ? (
        <EmptyState
          title="No billing parameters found"
          description="Seed or configure the allowed billing parameters before continuing."
        />
      ) : null}

      {!isLoading && !loadError && parameters.length > 0 ? (
        <>
          <ParameterGroup
            title="Rates and fees"
            description="Non-negative values used when new invoices are generated."
            configs={feeConfigs}
            values={values}
            errors={errors}
            parameterByName={parameterByName}
            disabled={isSaving}
            onChange={updateValue}
          />

          <ParameterGroup
            title="Billing cycle"
            description="Current-period timing and the default new contract duration."
            configs={cycleConfigs}
            values={values}
            errors={errors}
            parameterByName={parameterByName}
            disabled={isSaving}
            onChange={updateValue}
          />
        </>
      ) : null}
    </section>
  )
}

function ParameterGroup({
  title,
  description,
  configs,
  values,
  errors,
  parameterByName,
  disabled,
  onChange,
}: {
  title: string
  description: string
  configs: ParameterConfig[]
  values: Partial<FormValues>
  errors: FormErrors
  parameterByName: Map<ParameterName, AdminParameter>
  disabled: boolean
  onChange: (name: ParameterName, value: string) => void
}) {
  return (
    <div className="rounded-lg border border-hairline bg-surface">
      <div className="border-b border-hairline px-4 py-3">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="grid gap-0 divide-y divide-hairline">
        {configs.map((config) => {
          const parameter = parameterByName.get(config.name)
          const value = values[config.name] ?? ''
          const error = errors[config.name]

          return (
            <div
              key={config.name}
              className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(13rem,1fr)_minmax(14rem,20rem)] md:items-start"
            >
              <div>
                <Label htmlFor={config.name}>{config.label}</Label>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  {config.description}
                </p>
              </div>

              <div className="grid gap-1.5">
                <div className="flex items-center gap-2">
                  <Input
                    id={config.name}
                    type="number"
                    min={config.min}
                    max={config.max}
                    step={config.step}
                    value={value}
                    disabled={disabled || !parameter}
                    aria-invalid={Boolean(error)}
                    onChange={(event) =>
                      onChange(config.name, event.target.value)
                    }
                    className="bg-white"
                  />
                  <span className="w-20 shrink-0 text-sm text-muted-foreground">
                    {config.unit}
                  </span>
                </div>
                {error ? (
                  <p className="text-xs text-destructive">{error}</p>
                ) : null}
                {!parameter ? (
                  <p className="text-xs text-destructive">
                    This parameter is missing from the backend.
                  </p>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Alert({
  tone,
  children,
  onDismiss,
}: {
  tone: 'success' | 'danger'
  children: React.ReactNode
  onDismiss: () => void
}) {
  const className =
    tone === 'success'
      ? 'border-[#bfd2bf] bg-status-success-bg text-status-success-fg'
      : 'border-[#e0c2bc] bg-status-danger-bg text-status-danger-fg'

  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={`flex items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm ${className}`}
    >
      <span>{children}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Dismiss message"
        className="text-current hover:bg-black/5"
        onClick={onDismiss}
      >
        <CloseIcon />
      </Button>
    </div>
  )
}

function toFormValues(parameters: AdminParameter[]) {
  return parameters.reduce<Partial<FormValues>>((formValues, parameter) => {
    formValues[parameter.name] = parameter.value
    return formValues
  }, {})
}

function validateParameters(values: Partial<FormValues>) {
  const errors: FormErrors = {}

  parameterConfigs.forEach((config) => {
    const rawValue = values[config.name]?.trim() ?? ''
    const numericValue = Number(rawValue)

    if (!rawValue) {
      errors[config.name] = 'Enter a value.'
      return
    }

    if (Number.isNaN(numericValue)) {
      errors[config.name] = 'Enter a valid number.'
      return
    }

    if (config.integer && !Number.isInteger(numericValue)) {
      errors[config.name] = 'Enter a whole number.'
      return
    }

    if (numericValue < config.min) {
      errors[config.name] =
        config.min === 0
          ? 'Value cannot be negative.'
          : `Value must be at least ${config.min}.`
      return
    }

    if (config.max !== undefined && numericValue > config.max) {
      errors[config.name] = `Value must be ${config.max} or less.`
    }
  })

  const startDay = Number(values.meterReadingStartDay)
  const endDay = Number(values.meterReadingEndDay)

  if (
    !Number.isNaN(startDay) &&
    !Number.isNaN(endDay) &&
    startDay > endDay
  ) {
    errors.meterReadingStartDay =
      'Start date must be earlier than or equal to end date.'
    errors.meterReadingEndDay =
      'End date must be later than or equal to start date.'
  }

  return errors
}

export { ParametersPage }
