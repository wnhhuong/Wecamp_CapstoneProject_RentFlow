import { useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router";

import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CalendarIcon, EyeIcon, EyeOffIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SelectPopover } from "@/components/ui/select-popover";
import { Spinner } from "@/components/ui/spinner";
import { ROUTES } from "@/router/routes";
import { submitProfile } from "@/shared/api/auth/first-login.api";
import { updateOnboardingToken } from "@/shared/auth/auth-store";
import { useAuth } from "@/shared/auth/useAuth";
import { SEX_LABELS } from "@/shared/utils/sexLabels";

import {
  DOB_PLACEHOLDER,
  EARLIEST_BIRTH_YEAR,
  dobFromDate,
  dobToApiDate,
  maskDob,
  parseDob,
  validateProfile,
  type ProfileField,
  type ProfileForm,
} from "./onboarding.validation";

const EMPTY_FORM: ProfileForm = {
  fullName: "",
  dob: "",
  phoneNumber: "",
  identityNo: "",
  sex: "",
  nationality: "",
  por: "",
  password: "",
  confirmPassword: "",
};

const SEX_ITEMS = Object.entries(SEX_LABELS).map(([value, label]) => ({
  value,
  label,
}));

function FirstLoginProfilePage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [confirmedInformation, setConfirmedInformation] = useState(false);
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const username = session?.account.username ?? "";
  const problems = validateProfile(form, confirmedInformation);
  const problemOf = (field: ProfileField) =>
    hasTriedSubmit ? problems[field] : undefined;
  const selectedDob = parseDob(form.dob);

  function change(field: keyof ProfileForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function review(event: FormEvent) {
    event.preventDefault();

    setHasTriedSubmit(true);
    if (Object.keys(problems).length > 0) return;

    setSaveError("");
    setIsConfirmOpen(true);
  }

  async function save() {
    if (isSaving) return;

    const dob = dobToApiDate(form.dob);
    if (!dob) return;

    setIsSaving(true);
    setSaveError("");

    try {
      const result = await submitProfile({
        ...form,
        dob,
        confirmIn4: String(confirmedInformation),
      });
      updateOnboardingToken(result.onboardingToken);
      void navigate(ROUTES.auth.firstLoginContract);
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Your information could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <PageContainer>
      <div className="mx-auto w-full max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand">
          First login · Step 1 of 2
        </p>

        <div className="mt-2 flex justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">
              Complete your personal information
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This information will be inserted into your digital contract.
            </p>
          </div>
          <span className="h-fit shrink-0 rounded-full bg-status-info-bg px-3 py-1.5 text-xs font-medium text-status-info-fg">
            Room {username || "—"}
          </span>
        </div>

        <form
          aria-label="first-login-profile"
          aria-busy={isSaving}
          onSubmit={review}
          className="mt-6 grid gap-5 rounded-2xl border border-hairline bg-card p-5 sm:grid-cols-2 sm:p-7"
        >
          {/* Chrome takes the text field above the password box as the username
              unless a field claims the role, and would offer to save the year
              of birth instead of the room code. */}
          <input
            type="text"
            name="username"
            autoComplete="username"
            value={username}
            readOnly
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
          />

          <Field
            id="fullName"
            label="Full name"
            help="As written on your citizen ID."
            problem={problemOf("fullName")}
            className="sm:col-span-2"
          >
            {(describedBy) => (
              <Input
                id="fullName"
                name="fullName"
                autoComplete="name"
                placeholder="Nguyen Van A"
                value={form.fullName}
                disabled={isSaving}
                aria-invalid={Boolean(problemOf("fullName"))}
                aria-describedby={describedBy}
                onChange={(event) => change("fullName", event.target.value)}
              />
            )}
          </Field>

          <Field
            id="dob"
            label="Date of birth"
            help={`Type it as ${DOB_PLACEHOLDER} or pick it from the calendar.`}
            problem={problemOf("dob")}
          >
            {(describedBy) => (
              <div className="relative">
                <Input
                  id="dob"
                  name="dob"
                  autoComplete="off"
                  inputMode="numeric"
                  placeholder={DOB_PLACEHOLDER}
                  value={form.dob}
                  disabled={isSaving}
                  aria-invalid={Boolean(problemOf("dob"))}
                  aria-describedby={describedBy}
                  className="pr-11"
                  onChange={(event) =>
                    change("dob", maskDob(event.target.value))
                  }
                />

                <Popover
                  modal
                  open={isCalendarOpen}
                  onOpenChange={setIsCalendarOpen}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label="Pick your date of birth"
                      disabled={isSaving}
                      className="absolute inset-y-1 right-1 grid w-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-ink/[0.06] hover:text-foreground"
                    >
                      <CalendarIcon className="size-[18px]" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end">
                    <Calendar
                      mode="single"
                      autoFocus
                      selected={selectedDob ?? undefined}
                      defaultMonth={selectedDob ?? new Date(2000, 0)}
                      startMonth={new Date(EARLIEST_BIRTH_YEAR, 0)}
                      endMonth={new Date()}
                      disabled={{ after: new Date() }}
                      onSelect={(day) => {
                        if (!day) return;
                        change("dob", dobFromDate(day));
                        setIsCalendarOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </Field>

          <Field
            id="sex"
            label="Sex"
            help="Recorded on the contract."
            problem={problemOf("sex")}
          >
            {(describedBy) => (
              <SelectPopover
                id="sex"
                items={SEX_ITEMS}
                value={form.sex}
                onChange={(value) => change("sex", value)}
                placeholder="Select sex"
                invalid={Boolean(problemOf("sex"))}
                disabled={isSaving}
                describedBy={describedBy}
              />
            )}
          </Field>

          <Field
            id="phoneNumber"
            label="Phone number"
            help="The owner uses this to reach you."
            problem={problemOf("phoneNumber")}
          >
            {(describedBy) => (
              <Input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                autoComplete="tel"
                inputMode="numeric"
                placeholder="0901234567"
                value={form.phoneNumber}
                disabled={isSaving}
                aria-invalid={Boolean(problemOf("phoneNumber"))}
                aria-describedby={describedBy}
                onChange={(event) =>
                  change("phoneNumber", digitsOnly(event.target.value, 11))
                }
              />
            )}
          </Field>

          <Field
            id="identityNo"
            label="Identity number"
            help="The 12 digits on your citizen ID."
            problem={problemOf("identityNo")}
          >
            {(describedBy) => (
              <Input
                id="identityNo"
                name="identityNo"
                autoComplete="off"
                inputMode="numeric"
                placeholder="001202000001"
                value={form.identityNo}
                disabled={isSaving}
                aria-invalid={Boolean(problemOf("identityNo"))}
                aria-describedby={describedBy}
                onChange={(event) =>
                  change("identityNo", digitsOnly(event.target.value, 12))
                }
              />
            )}
          </Field>

          <Field
            id="nationality"
            label="Nationality"
            help="As written on your citizen ID."
            problem={problemOf("nationality")}
          >
            {(describedBy) => (
              <Input
                id="nationality"
                name="nationality"
                autoComplete="country-name"
                placeholder="Vietnam"
                value={form.nationality}
                disabled={isSaving}
                aria-invalid={Boolean(problemOf("nationality"))}
                aria-describedby={describedBy}
                onChange={(event) => change("nationality", event.target.value)}
              />
            )}
          </Field>

          <Field
            id="por"
            label="Place of residence"
            help="The permanent address kept on your ID."
            problem={problemOf("por")}
          >
            {(describedBy) => (
              <Input
                id="por"
                name="por"
                autoComplete="street-address"
                placeholder="Ho Chi Minh City"
                value={form.por}
                disabled={isSaving}
                aria-invalid={Boolean(problemOf("por"))}
                aria-describedby={describedBy}
                onChange={(event) => change("por", event.target.value)}
              />
            )}
          </Field>

          <Field
            id="password"
            label="New password"
            help="You will sign in with this from now on."
            problem={problemOf("password")}
          >
            {(describedBy) => (
              <PasswordInput
                id="password"
                value={form.password}
                visible={showPassword}
                disabled={isSaving}
                invalid={Boolean(problemOf("password"))}
                describedBy={describedBy}
                onChange={(value) => change("password", value)}
                onToggle={() => setShowPassword((current) => !current)}
              />
            )}
          </Field>

          <Field
            id="confirmPassword"
            label="Confirm new password"
            help="Type the same password again."
            problem={problemOf("confirmPassword")}
          >
            {(describedBy) => (
              <PasswordInput
                id="confirmPassword"
                value={form.confirmPassword}
                visible={showConfirmPassword}
                disabled={isSaving}
                invalid={Boolean(problemOf("confirmPassword"))}
                describedBy={describedBy}
                onChange={(value) => change("confirmPassword", value)}
                onToggle={() => setShowConfirmPassword((current) => !current)}
              />
            )}
          </Field>

          <div className="flex justify-between sm:col-span-2">
            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="confirmIn4"
                  checked={confirmedInformation}
                  disabled={isSaving}
                  aria-invalid={Boolean(problemOf("confirmIn4"))}
                  aria-describedby="confirmIn4-help"
                  onCheckedChange={(checked) =>
                    setConfirmedInformation(checked === true)
                  }
                />
                <Label htmlFor="confirmIn4" className="font-normal">
                  I confirm that the information provided is accurate.
                </Label>
              </div>
              <p
                id="confirmIn4-help"
                className={
                  problemOf("confirmIn4")
                    ? "text-sm text-destructive"
                    : "text-sm text-muted-foreground"
                }
              >
                {problemOf("confirmIn4") ??
                  "The owner writes your contract from exactly what is above."}
              </p>
            </div>
            <Button type="submit" disabled={isSaving}>
              Continue to contract →
            </Button>
          </div>
        </form>
      </div>

      <Dialog
        open={isConfirmOpen}
        onOpenChange={(next) => {
          if (!isSaving) setIsConfirmOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save your information?</DialogTitle>
            <DialogDescription>
              Your contract is generated from these details. The owner has to
              correct them for you once you continue.
            </DialogDescription>
          </DialogHeader>

          <p className="text-sm text-body">
            {form.fullName} · {form.dob} · Room {username || "—"}
          </p>

          {saveError ? (
            <p role="alert" className="text-sm text-destructive">
              {saveError}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => setIsConfirmOpen(false)}
            >
              Keep editing
            </Button>
            <Button
              type="button"
              variant="dark"
              disabled={isSaving}
              onClick={() => void save()}
            >
              {isSaving ? <Spinner /> : null}
              {isSaving ? "Saving…" : "Save & continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

function Field({
  id,
  label,
  help,
  problem,
  className,
  children,
}: {
  id: string;
  label: string;
  help: string;
  problem?: string;
  className?: string;
  children: (describedBy: string) => ReactNode;
}) {
  const describedBy = `${id}-help`;

  return (
    <div className={className ? `space-y-1.5 ${className}` : "space-y-1.5"}>
      <Label htmlFor={id}>{label}</Label>
      {children(describedBy)}
      <p
        id={describedBy}
        className={
          problem ? "text-sm text-destructive" : "text-sm text-muted-foreground"
        }
      >
        {problem ?? help}
      </p>
    </div>
  );
}

function PasswordInput({
  id,
  value,
  visible,
  disabled,
  invalid,
  describedBy,
  onChange,
  onToggle,
}: {
  id: string;
  value: string;
  visible: boolean;
  disabled: boolean;
  invalid: boolean;
  describedBy: string;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        name={id}
        type={visible ? "text" : "password"}
        autoComplete="new-password"
        value={value}
        disabled={disabled}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className="pr-11"
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        disabled={disabled}
        className="absolute inset-y-1 right-1 grid w-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-ink/[0.06] hover:text-foreground"
        onClick={onToggle}
      >
        {visible ? (
          <EyeIcon className="size-[18px]" />
        ) : (
          <EyeOffIcon className="size-[18px]" />
        )}
      </button>
    </div>
  );
}

function digitsOnly(value: string, limit: number): string {
  return value.replace(/\D/g, "").slice(0, limit);
}

export { FirstLoginProfilePage };
