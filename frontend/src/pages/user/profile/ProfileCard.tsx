import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { updateTenantProfile } from "@/shared/api/user/profile.api";
import type { TenantProfile, TenantSex } from "@/shared/types/profile";
import { formatDate } from "@/shared/utils/dateFormatter";

const SEX_LABELS: Record<TenantSex, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
};

/** Mirrors the backend rule so a bad number never leaves the page. */
const PHONE_PATTERN = /^[0-9+]{9,15}$/;

const ROW_CLASS =
  "flex flex-wrap items-start justify-between gap-3 border-b border-hairline py-2.5 text-sm last:border-b-0";

interface ProfileCardProps {
  profile: TenantProfile;
  onSaved: (profile: TenantProfile) => void;
}

function ProfileCard({ profile, onSaved }: ProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <ContactForm
        profile={profile}
        onCancel={() => setIsEditing(false)}
        onSaved={(saved) => {
          onSaved(saved);
          setIsEditing(false);
        }}
      />
    );
  }

  return (
    <CardShell
      action={
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsEditing(true)}
        >
          Edit
        </Button>
      }
    >
      <ProfileRows
        profile={profile}
        phone={
          <Row
            label="Phone number"
            value={profile.phoneNumber || "Not provided"}
          />
        }
        residence={
          <Row
            label="Place of residence"
            value={profile.placeOfResidence || "Not provided"}
          />
        }
      />
    </CardShell>
  );
}

function CardShell({
  action,
  children,
}: {
  action: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-hairline bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">
          Personal details
        </h2>
        <div className="flex flex-wrap items-center gap-3">{action}</div>
      </div>

      {children}
    </section>
  );
}

/**
 * Both modes render this same list, so switching to edit only swaps the last
 * two values for inputs instead of moving anything above them.
 */
function ProfileRows({
  profile,
  phone,
  residence,
}: {
  profile: TenantProfile;
  phone: React.ReactNode;
  residence: React.ReactNode;
}) {
  return (
    <dl className="mt-5">
      <Row label="Full name" value={profile.fullName} />
      <Row
        label="Date of birth"
        value={profile.dob ? formatDate(profile.dob) : "Not provided"}
      />
      <Row label="Identity number" value={profile.identityNo} />
      <Row label="Sex" value={SEX_LABELS[profile.sex]} />
      <Row label="Nationality" value={profile.nationality} />
      {phone}
      {residence}
    </dl>
  );
}

function ContactForm({
  profile,
  onCancel,
  onSaved,
}: {
  profile: TenantProfile;
  onCancel: () => void;
  onSaved: (profile: TenantProfile) => void;
}) {
  const [phoneNumber, setPhoneNumber] = useState(profile.phoneNumber);
  const [placeOfResidence, setPlaceOfResidence] = useState(
    profile.placeOfResidence,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const trimmedPhone = phoneNumber.trim();
  const trimmedResidence = placeOfResidence.trim();
  const isPhoneValid = PHONE_PATTERN.test(trimmedPhone);
  const canSave = isPhoneValid && trimmedResidence.length > 0;

  async function save() {
    if (!canSave || isSaving) return;

    setIsSaving(true);
    setSaveError("");

    try {
      onSaved(
        await updateTenantProfile({
          phoneNumber: trimmedPhone,
          placeOfResidence: trimmedResidence,
        }),
      );
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Your details could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      aria-busy={isSaving}
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <CardShell
        action={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSave || isSaving}>
              {isSaving ? <Spinner /> : null}
              {isSaving ? "Saving…" : "Save changes"}
            </Button>
          </>
        }
      >
        <ProfileRows
          profile={profile}
          phone={
            <EditableRow htmlFor="profile-phone" label="Phone number">
              <Input
                id="profile-phone"
                type="tel"
                inputMode="tel"
                required
                value={phoneNumber}
                disabled={isSaving}
                aria-invalid={trimmedPhone !== "" && !isPhoneValid}
                aria-describedby="profile-phone-help"
                className="text-right"
                onChange={(event) => setPhoneNumber(event.target.value)}
              />
              <p
                id="profile-phone-help"
                className={
                  trimmedPhone !== "" && !isPhoneValid
                    ? "text-right text-sm text-destructive"
                    : "text-right text-sm text-muted-foreground"
                }
              >
                9 to 15 digits, "+" allowed for a country code.
              </p>
            </EditableRow>
          }
          residence={
            <EditableRow htmlFor="profile-residence" label="Place of residence">
              <Input
                id="profile-residence"
                type="text"
                required
                value={placeOfResidence}
                disabled={isSaving}
                className="text-right"
                onChange={(event) => setPlaceOfResidence(event.target.value)}
              />
              <p className="text-right text-sm text-muted-foreground">
                Where you are registered as living.
              </p>
            </EditableRow>
          }
        />

        <p className="mt-5 border-l-2 border-clay pl-3 text-sm leading-6 text-body">
          Only your phone number and place of residence can be changed here. The
          rest comes from your signed lease.
        </p>

        {saveError ? (
          <p role="alert" className="mt-5 text-sm text-destructive">
            {saveError}
          </p>
        ) : null}
      </CardShell>
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={ROW_CLASS}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}

function EditableRow({
  htmlFor,
  label,
  children,
}: {
  htmlFor: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className={ROW_CLASS}>
      <Label
        htmlFor={htmlFor}
        className="pt-2 font-normal text-muted-foreground"
      >
        {label}
      </Label>
      <div className="w-full max-w-72 space-y-1.5">{children}</div>
    </div>
  );
}

export { ProfileCard };
