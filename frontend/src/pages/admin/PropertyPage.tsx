import { useEffect, useMemo, useState } from "react";

import {
  Alert,
  EmptyState,
  ErrorState,
  PageLoading,
} from "@/components/feedback";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  getAdminPropertyParameters,
  updateAdminParameters,
} from "@/shared/api/admin/parameters.api";
import type {
  AdminParameter,
  PropertyParameterName,
} from "@/shared/types/admin/parameter";

import {
  propertyFieldConfigs,
  validatePropertyValues,
  type PropertyFieldConfig,
  type PropertyFormErrors,
  type PropertyFormValues,
} from "./property/utils/propertyFields";

function PropertyPage() {
  const [parameters, setParameters] = useState<AdminParameter[]>([]);
  const [values, setValues] = useState<Partial<PropertyFormValues>>({});
  const [errors, setErrors] = useState<PropertyFormErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  async function loadParameters() {
    setIsLoading(true);
    setLoadError("");

    try {
      const loaded = await getAdminPropertyParameters();
      setParameters(loaded);
      setValues(toFormValues(loaded));
      setErrors({});
      setSaveError("");
      setSaveMessage("");
    } catch {
      setLoadError("The property details could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isActive = true;

    getAdminPropertyParameters()
      .then((loaded) => {
        if (!isActive) return;
        setParameters(loaded);
        setValues(toFormValues(loaded));
      })
      .catch(() => {
        if (isActive) setLoadError("The property details could not be loaded.");
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const parameterByName = useMemo(() => {
    return new Map(parameters.map((parameter) => [parameter.name, parameter]));
  }, [parameters]);

  const changedFields = useMemo(() => {
    return propertyFieldConfigs.filter((config) => {
      const parameter = parameterByName.get(config.name);
      return parameter && values[config.name] !== parameter.value;
    });
  }, [parameterByName, values]);

  function updateValue(name: PropertyParameterName, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setSaveError("");
    setSaveMessage("");
  }

  async function handleSave() {
    const nextErrors = validatePropertyValues(values);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setSaveError("Please fix the highlighted fields before saving.");
      return;
    }

    const updates = changedFields
      .map((config) => {
        const parameter = parameterByName.get(config.name);
        return parameter
          ? {
              parameterID: parameter.id,
              value: (values[config.name] ?? "").trim(),
            }
          : null;
      })
      .filter((update) => update !== null);

    if (updates.length === 0) return;

    setIsSaving(true);
    setSaveError("");
    setSaveMessage("");

    try {
      const updated = await updateAdminParameters(updates);

      setParameters((current) =>
        current.map((parameter) => {
          const match = updated.find(
            (candidate) => candidate.name === parameter.name,
          );
          return match ?? parameter;
        }),
      );
      setValues((current) => ({ ...current, ...toFormValues(updated) }));
      setErrors({});
      setSaveMessage("Property details were saved successfully.");
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "The property details could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleReset() {
    setValues(toFormValues(parameters));
    setErrors({});
    setSaveError("");
    setSaveMessage("");
  }

  const identityConfigs = propertyFieldConfigs.filter(
    (config) => config.group === "identity",
  );
  const contactConfigs = propertyFieldConfigs.filter(
    (config) => config.group === "contact",
  );

  return (
    <PageContainer>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">
            Property details
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Shown in the top bar and on the public room catalogue.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={isSaving || changedFields.length === 0}
          >
            Reset
          </Button>
          <Button
            type="button"
            variant="dark"
            onClick={() => void handleSave()}
            disabled={isSaving || changedFields.length === 0}
          >
            {isSaving ? <Spinner /> : null}
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>

      {saveMessage ? (
        <Alert tone="success" onDismiss={() => setSaveMessage("")}>
          {saveMessage}
        </Alert>
      ) : null}

      {saveError ? (
        <Alert tone="danger" onDismiss={() => setSaveError("")}>
          {saveError}
        </Alert>
      ) : null}

      {isLoading ? (
        <PageLoading
          title="Loading property details"
          description="Preparing the property information..."
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
          title="No property details found"
          description="Seed the property parameters before continuing."
        />
      ) : null}

      {!isLoading && !loadError && parameters.length > 0 ? (
        <>
          <PropertyGroup
            title="Property"
            description="Name and address tenants and visitors see."
            configs={identityConfigs}
            values={values}
            errors={errors}
            parameterByName={parameterByName}
            disabled={isSaving}
            onChange={updateValue}
          />

          <PropertyGroup
            title="Owner contact"
            description="How tenants reach you. Only Facebook can be left empty."
            configs={contactConfigs}
            values={values}
            errors={errors}
            parameterByName={parameterByName}
            disabled={isSaving}
            onChange={updateValue}
          />
        </>
      ) : null}
    </PageContainer>
  );
}

function PropertyGroup({
  title,
  description,
  configs,
  values,
  errors,
  parameterByName,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  configs: PropertyFieldConfig[];
  values: Partial<PropertyFormValues>;
  errors: PropertyFormErrors;
  parameterByName: Map<string, AdminParameter>;
  disabled: boolean;
  onChange: (name: PropertyParameterName, value: string) => void;
}) {
  return (
    <div className="rounded-lg border border-hairline bg-surface">
      <div className="border-b border-hairline px-4 py-3">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="grid gap-0 divide-y divide-hairline">
        {configs.map((config) => {
          const parameter = parameterByName.get(config.name);
          const value = values[config.name] ?? "";
          const error = errors[config.name];

          return (
            <div
              key={config.name}
              className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(13rem,1fr)_minmax(14rem,24rem)] md:items-start"
            >
              <div>
                <Label htmlFor={config.name}>
                  {config.label}
                  {config.optional ? (
                    <span className="ml-1 font-normal text-muted-foreground">
                      (optional)
                    </span>
                  ) : null}
                </Label>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  {config.description}
                </p>
              </div>

              <div className="grid gap-1.5">
                <Input
                  id={config.name}
                  type="text"
                  inputMode={config.inputMode}
                  maxLength={config.maxLength}
                  placeholder={config.placeholder}
                  value={value}
                  disabled={disabled || !parameter}
                  aria-invalid={Boolean(error)}
                  onChange={(event) => onChange(config.name, event.target.value)}
                  className="bg-white"
                />
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
          );
        })}
      </div>
    </div>
  );
}

function toFormValues(parameters: AdminParameter[]) {
  const values: Partial<PropertyFormValues> = {};

  for (const parameter of parameters) {
    values[parameter.name as PropertyParameterName] = parameter.value;
  }

  return values;
}

export { PropertyPage };
