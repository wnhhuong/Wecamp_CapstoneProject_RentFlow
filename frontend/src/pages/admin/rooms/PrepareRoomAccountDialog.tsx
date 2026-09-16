import { useRef, useState } from "react";

import { StatusBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CopyIcon, KeyIcon, RefreshIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { prepareRoomAccount } from "@/shared/api/admin/rooms.api";
import type {
  AdminRoom,
  PreparedRoomCredential,
} from "@/shared/types/admin/room";

interface PrepareRoomAccountDialogProps {
  open: boolean;
  room: AdminRoom | null;
  onOpenChange: (open: boolean) => void;
  onAccountPrepared: (room: AdminRoom) => void;
}

function PrepareRoomAccountDialog({
  open,
  room,
  onOpenChange,
  onAccountPrepared,
}: PrepareRoomAccountDialogProps) {
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const [temporaryPassword, setTemporaryPassword] = useState(
    generateTemporaryPassword,
  );
  const [credential, setCredential] = useState<PreparedRoomCredential | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [copiedField, setCopiedField] = useState<
    "username" | "password" | null
  >(null);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setTemporaryPassword(generateTemporaryPassword());
      setCredential(null);
      setIsSubmitting(false);
      setError("");
      setCopiedField(null);
    }

    onOpenChange(nextOpen);
  }

  function handleGeneratePassword() {
    setTemporaryPassword(generateTemporaryPassword());
    setError("");
    setCopiedField(null);
    window.requestAnimationFrame(() => passwordInputRef.current?.focus());
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!room) return;

    if (temporaryPassword.trim().length < 6) {
      setError("Temporary password must contain at least 6 characters.");
      passwordInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const normalizedPassword = temporaryPassword.trim();
      const result = await prepareRoomAccount({
        roomID: room.roomID,
        temporaryPassword: normalizedPassword,
      });
      setCredential(result.credential);
      onAccountPrepared(result.room);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "The room account could not be prepared.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyCredential(field: "username" | "password", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setError("");
    } catch {
      setError("Copy failed. Select the value and copy it manually.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-[560px]">
        {credential ? (
          <CredentialResult
            roomCode={room?.roomCode ?? ""}
            credential={credential}
            copiedField={copiedField}
            error={error}
            onCopy={copyCredential}
          />
        ) : (
          <form className="grid gap-5" onSubmit={handleSubmit}>
            <DialogHeader>
              <div className="mb-1 flex size-10 items-center justify-center rounded-md bg-muted text-foreground">
                <KeyIcon className="size-5" />
              </div>
              <DialogTitle>Prepare room account</DialogTitle>
              <DialogDescription>
                Generate a temporary password for the next tenant. No user or
                contract will be created.
              </DialogDescription>
            </DialogHeader>

            {room ? (
              <div className="grid gap-3 rounded-md border border-hairline bg-surface p-4 sm:grid-cols-2">
                <AccountDetail label="Room" value={room.roomCode} />
                <AccountDetail
                  label="Username"
                  value={room.account?.username ?? "No account"}
                />
                <div className="sm:col-span-2">
                  <span className="mb-1.5 block text-xs text-muted-foreground">
                    Current account status
                  </span>
                  {room.account ? (
                    <StatusBadge
                      domain="account"
                      status={room.account.status}
                    />
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      No account
                    </span>
                  )}
                </div>
              </div>
            ) : null}

            {room?.account?.status !== "banned" ? (
              <div
                role="alert"
                className="rounded-md border border-[#e0c2bc] bg-status-danger-bg px-4 py-3 text-sm text-status-danger-fg"
              >
                Only a BANNED room account can be prepared for a new tenant.
              </div>
            ) : null}

            {error ? (
              <div
                role="alert"
                className="rounded-md border border-[#e0c2bc] bg-status-danger-bg px-4 py-3 text-sm text-status-danger-fg"
              >
                {error}
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="temporary-password">Temporary password</Label>
              <div className="flex gap-2">
                <Input
                  ref={passwordInputRef}
                  id="temporary-password"
                  value={temporaryPassword}
                  onChange={(event) => {
                    setTemporaryPassword(event.target.value);
                    setError("");
                  }}
                  minLength={6}
                  autoComplete="new-password"
                  spellCheck={false}
                  aria-invalid={Boolean(error)}
                  disabled={room?.account?.status !== "banned" || isSubmitting}
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon-lg"
                  onClick={handleGeneratePassword}
                  disabled={room?.account?.status !== "banned" || isSubmitting}
                  aria-label="Generate another temporary password"
                  title="Generate another temporary password"
                >
                  <RefreshIcon />
                </Button>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                At least 6 characters. The generated value includes uppercase,
                lowercase, numbers and symbols.
              </p>
            </div>

            <div className="rounded-md border border-[#d9cda9] bg-status-warning-bg px-4 py-3 text-sm leading-5 text-status-warning-fg">
              Preparing this account replaces the old password and changes its
              status from BANNED to INACTIVE.
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                variant="dark"
                disabled={room?.account?.status !== "banned" || isSubmitting}
              >
                {isSubmitting ? <Spinner /> : <KeyIcon />}
                {isSubmitting ? "Preparing..." : "Prepare account"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CredentialResult({
  roomCode,
  credential,
  copiedField,
  error,
  onCopy,
}: {
  roomCode: string;
  credential: PreparedRoomCredential;
  copiedField: "username" | "password" | null;
  error: string;
  onCopy: (field: "username" | "password", value: string) => Promise<void>;
}) {
  return (
    <div className="grid gap-5">
      <DialogHeader>
        <DialogTitle>Room account is ready</DialogTitle>
        <DialogDescription>
          Account for room {roomCode} is now INACTIVE and ready to be handed to
          the tenant.
        </DialogDescription>
      </DialogHeader>

      <div
        role="status"
        className="rounded-md border border-[#bfd2bf] bg-status-success-bg px-4 py-3 text-sm text-status-success-fg"
      >
        Temporary credentials generated successfully.
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-md border border-[#e0c2bc] bg-status-danger-bg px-4 py-3 text-sm text-status-danger-fg"
        >
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 rounded-md border border-hairline bg-surface p-4">
        <CredentialField
          label="Username"
          value={credential.username}
          copied={copiedField === "username"}
          onCopy={() => onCopy("username", credential.username)}
        />
        <CredentialField
          label="Temporary password"
          value={credential.temporaryPassword}
          copied={copiedField === "password"}
          onCopy={() => onCopy("password", credential.temporaryPassword)}
        />
        <div className="flex items-center justify-between gap-3 border-t border-hairline pt-3">
          <span className="text-sm text-muted-foreground">Account status</span>
          <StatusBadge domain="account" status={credential.status} />
        </div>
      </div>

      <p className="text-sm leading-5 text-muted-foreground">
        Give these credentials to the tenant outside RentFlow. The temporary
        password will not be shown again after this dialog is closed.
      </p>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="dark">
            Done
          </Button>
        </DialogClose>
      </DialogFooter>
    </div>
  );
}

function CredentialField({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => Promise<void>;
}) {
  return (
    <div className="grid gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 overflow-x-auto rounded-md bg-muted px-3 py-2.5 text-sm text-foreground">
          {value}
        </code>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => void onCopy()}
          aria-label={`Copy ${label.toLowerCase()}`}
          title={`Copy ${label.toLowerCase()}`}
        >
          <CopyIcon />
        </Button>
      </div>
      <span className="h-4 text-xs text-status-success-fg" aria-live="polite">
        {copied ? "Copied" : ""}
      </span>
    </div>
  );
}

function AccountDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function generateTemporaryPassword(length = 12) {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowercase = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%";
  const allCharacters = uppercase + lowercase + numbers + symbols;
  const requiredCharacters = [uppercase, lowercase, numbers, symbols].map(
    randomCharacter,
  );
  const remainingCharacters = Array.from(
    { length: length - requiredCharacters.length },
    () => randomCharacter(allCharacters),
  );

  return shuffle([...requiredCharacters, ...remainingCharacters]).join("");
}

function randomCharacter(characters: string) {
  const randomValue = crypto.getRandomValues(new Uint32Array(1))[0];
  return characters[randomValue % characters.length];
}

function shuffle(characters: string[]) {
  const shuffled = [...characters];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomValue = crypto.getRandomValues(new Uint32Array(1))[0];
    const randomIndex = randomValue % (index + 1);
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

export { PrepareRoomAccountDialog };
