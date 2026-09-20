import { useState } from "react";

import { StatusBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { ContractAgreement } from "@/components/ui/contract-agreement";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TenantContract } from "@/shared/types/contract";
import type { TenantProfile } from "@/shared/types/profile";
import { formatCurrency } from "@/shared/utils/currencyFormatter";
import { formatDate } from "@/shared/utils/dateFormatter";

interface LeaseCardProps {
  contract: TenantContract;
  profile: TenantProfile;
}

function LeaseCard({ contract, profile }: LeaseCardProps) {
  const [isContractOpen, setIsContractOpen] = useState(false);

  return (
    <section className="flex flex-col rounded-lg bg-ink p-5 text-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold">Active lease</h2>
          <StatusBadge domain="contract" status={contract.status} />
        </div>

        <Button type="button" onClick={() => setIsContractOpen(true)}>
          View contract
        </Button>
      </div>

      <dl className="mt-5">
        <Row label="Contract ID" value={contract.displayID} />
        <Row label="Room" value={contract.roomCode} />
        <Row label="Start date" value={formatDate(contract.startDate)} />
        <Row label="Expiry date" value={formatDate(contract.expireDate)} />
        <Row label="Monthly rent" value={formatCurrency(contract.rentPrice)} />
        <Row
          label="Property deposit"
          value={formatCurrency(contract.propertyDeposit)}
        />
        <Row
          label="Signed"
          value={
            contract.signedAt
              ? formatDate(contract.signedAt, true)
              : "Not signed"
          }
        />
      </dl>

      <Dialog open={isContractOpen} onOpenChange={setIsContractOpen}>
        <DialogContent className="max-h-[80vh] w-[min(46rem,calc(100%-2rem))] max-w-none overflow-y-auto rounded-lg bg-field p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-xl">Lease agreement</DialogTitle>
            <DialogDescription>
              Contract {contract.displayID} · signed{" "}
              {contract.signedAt ? formatDate(contract.signedAt) : "—"}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4 text-sm leading-6 text-body">
            <ContractAgreement
              template={contract.terms.template}
              values={buildAgreementValues(contract, profile)}
            />
          </div>

          <div className="mt-6 border-t border-hairline pt-5">
            <p className="text-sm text-muted-foreground">
              Signed by {profile.fullName} ·{" "}
              {contract.signedAt ? formatDate(contract.signedAt, true) : "—"}
            </p>
            <SignatureImage src={contract.signatureImage} />
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function buildAgreementValues(
  contract: TenantContract,
  profile: TenantProfile,
): Record<string, string> {
  const rent = formatCurrency(contract.rentPrice);

  return {
    fullName: profile.fullName,
    tenantName: profile.fullName,
    identityNo: profile.identityNo,
    placeOfResidence: profile.placeOfResidence,
    roomCode: contract.roomCode,
    rent,
    monthlyRent: rent,
    deposit: formatCurrency(contract.propertyDeposit),
    startDate: formatDate(contract.startDate),
    expireDate: formatDate(contract.expireDate),
  };
}

function SignatureImage({ src }: { src: string }) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className="mt-3 flex aspect-[3/1] w-full max-w-sm items-center justify-center rounded-md border border-hairline bg-white text-sm text-muted-foreground">
        Signature image unavailable
      </div>
    );
  }

  return (
    <img
      src={src}
      alt="Your signature on the lease agreement"
      className="mt-3 w-full max-w-sm rounded-md border border-hairline bg-white object-contain p-3"
      onError={() => setHasError(true)}
    />
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-page/10 py-2.5 text-sm last:border-b-0">
      <dt className="text-page/60">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

export { LeaseCard };
