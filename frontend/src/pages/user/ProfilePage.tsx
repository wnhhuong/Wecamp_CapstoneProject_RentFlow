import { useEffect, useState } from "react";

import { ErrorState, PageLoading } from "@/components/feedback";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  getTenantProfile,
  updateTenantProfile,
} from "@/shared/api/user/profile.api";
import type { TenantProfile, TenantSex } from "@/shared/types/profile";
import { formatDate } from "@/shared/utils/dateFormatter";

const SEX_LABELS: Record<TenantSex, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
};

/** Mirrors the backend rule so a bad number never leaves the page. */
const PHONE_PATTERN = /^[0-9+]{9,15}$/;

const FIELD_LABEL_CLASS = "text-sm font-normal text-muted-foreground";

function ProfilePage() {
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  async function loadProfile() {
    setIsLoading(true);
    setLoadError("");

    try {
      setProfile(await getTenantProfile());
    } catch {
      setLoadError("Your profile could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    getTenantProfile(controller.signal)
      .then((loadedProfile) => setProfile(loadedProfile))
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoadError("Your profile could not be loaded.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, []);

  return (
    <PageContainer>
      <div>
        <h1 className="text-3xl font-semibold text-foreground">
          Profile &amp; lease
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          The personal details the owner holds for your tenancy
        </p>
      </div>

      {isLoading ? (
        <PageLoading
          title="Loading your profile"
          description="Fetching your personal details..."
        />
      ) : null}

      {loadError ? (
        <ErrorState
          description={loadError}
          onRetry={() => void loadProfile()}
        />
      ) : null}

      {!isLoading && !loadError && profile ? (
        isEditing ? (
          <ContactForm
            profile={profile}
            onCancel={() => setIsEditing(false)}
            onSaved={(saved) => {
              setProfile(saved);
              setIsEditing(false);
            }}
          />
        ) : (
          <ProfileCard
            action={
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(true)}
              >
                Edit contact details
              </Button>
            }
          >
            <ProfileGrid
              profile={profile}
              phone={
                <Field
                  label="Phone number"
                  value={profile.phoneNumber || "Not provided"}
                />
              }
              residence={
                <Field
                  label="Place of residence"
                  value={profile.placeOfResidence || "Not provided"}
                />
              }
            />
          </ProfileCard>
        )
      ) : null}
    </PageContainer>
  );
}

function ProfileCard({
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
 * Both modes render this same grid, so switching to edit only swaps the last
 * entry of each column for an input instead of moving anything above it.
 */
function ProfileGrid({
  profile,
  phone,
  residence,
}: {
  profile: TenantProfile;
  phone: React.ReactNode;
  residence: React.ReactNode;
}) {
  return (
    <dl className="mt-5 grid gap-5 sm:grid-cols-2">
      <div className="grid content-start gap-5">
        <Field label="Full name" value={profile.fullName} />
        <Field label="Identity number" value={profile.identityNo} />
        <Field label="Nationality" value={profile.nationality} />
        {phone}
      </div>

      <div className="grid content-start gap-5">
        <Field
          label="Date of birth"
          value={profile.dob ? formatDate(profile.dob) : "Not provided"}
        />
        <Field label="Sex" value={SEX_LABELS[profile.sex]} />
        {residence}
      </div>
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
      <ProfileCard
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
        <ProfileGrid
          profile={profile}
          phone={
            <div className="space-y-2">
              <Label htmlFor="profile-phone" className={FIELD_LABEL_CLASS}>
                Phone number
              </Label>
              <Input
                id="profile-phone"
                type="tel"
                inputMode="tel"
                required
                value={phoneNumber}
                disabled={isSaving}
                aria-invalid={trimmedPhone !== "" && !isPhoneValid}
                aria-describedby="profile-phone-help"
                onChange={(event) => setPhoneNumber(event.target.value)}
              />
              <p
                id="profile-phone-help"
                className={
                  trimmedPhone !== "" && !isPhoneValid
                    ? "text-sm text-destructive"
                    : "text-sm text-muted-foreground"
                }
              >
                9 to 15 digits, "+" allowed for a country code.
              </p>
            </div>
          }
          residence={
            <div className="space-y-2">
              <Label htmlFor="profile-residence" className={FIELD_LABEL_CLASS}>
                Place of residence
              </Label>
              <Input
                id="profile-residence"
                type="text"
                required
                value={placeOfResidence}
                disabled={isSaving}
                onChange={(event) => setPlaceOfResidence(event.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Where you are registered as living.
              </p>
            </div>
          }
        />

        {saveError ? (
          <p role="alert" className="mt-5 text-sm text-destructive">
            {saveError}
          </p>
        ) : null}
      </ProfileCard>
    </form>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium text-foreground">{value}</dd>
    </div>
  );
}

export { ProfilePage };
