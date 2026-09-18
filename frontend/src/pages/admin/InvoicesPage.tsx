import { useCallback, useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router";

import { EmptyState, ErrorState, PageLoading } from "@/components/feedback";
import { PageContainer } from "@/components/layout";
import { StatusBadge } from "@/components/status";
import { Pagination } from "@/components/ui/pagination";
import { StatTile } from "@/components/ui/stat-tile";
import { SearchFilter } from "@/components/ui/search-filter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROUTES } from "@/router/routes";
import { getAdminInvoices } from "@/shared/api/admin/invoices.api";
import type {
  AdminInvoice,
  AdminInvoiceSummary,
} from "@/shared/types/admin/invoice";
import type { ApiPagination } from "@/shared/types/api";
import { formatCurrency } from "@/shared/utils/currencyFormatter";
import {
  formatBillingPeriod,
  formatDate,
} from "@/shared/utils/dateFormatter";

const PERIOD_FILTER_ID = "billingPeriod";
const STATUS_FILTER_ID = "status";
const LATE_FILTER_ID = "late";

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;

const EMPTY_PAGINATION: ApiPagination = {
  page: 1,
  limit: PAGE_SIZE,
  totalItems: 0,
  totalPages: 1,
};

function InvoicesPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [billingPeriods, setBillingPeriods] = useState<string[]>([]);
  const [summary, setSummary] = useState<AdminInvoiceSummary>({
    billingPeriod: null,
    billed: 0,
    received: 0,
    stillOwed: 0,
  });
  const [pagination, setPagination] = useState<ApiPagination>(EMPTY_PAGINATION);
  const [filters, setFilters] = useState<Record<string, string[]>>({
    [PERIOD_FILTER_ID]: [],
    [STATUS_FILTER_ID]: [],
    [LATE_FILTER_ID]: [],
  });
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasDefaultedPeriod, setHasDefaultedPeriod] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const selectedPeriods = filters[PERIOD_FILTER_ID] ?? [];
  const selectedStatuses = filters[STATUS_FILTER_ID] ?? [];
  const selectedLate = filters[LATE_FILTER_ID] ?? [];

  const loadInvoices = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setLoadError("");

      try {
        const result = await getAdminInvoices(
          {
            search: appliedSearch || undefined,
            // The API takes one value per filter, so a widened selection is
            // resolved on the client instead of sending an unsupported list.
            billingPeriod:
              selectedPeriods.length === 1 ? selectedPeriods[0] : undefined,
            status:
              selectedStatuses.length === 1
                ? selectedStatuses[0] === "paid"
                  ? "paid"
                  : "not_paid"
                : undefined,
            isRequestLate:
              selectedLate.length === 1 ? selectedLate[0] === "yes" : undefined,
            page,
            limit: PAGE_SIZE,
          },
          signal,
        );

        setInvoices(result.items);
        setPagination(result.pagination);
        setBillingPeriods(result.billingPeriods);
        setSummary(result.summary);

        if (!hasDefaultedPeriod) {
          setHasDefaultedPeriod(true);
          if (result.billingPeriods.length > 0) {
            setFilters((current) => ({
              ...current,
              [PERIOD_FILTER_ID]: [result.billingPeriods[0]],
            }));
            return;
          }
        }

        setIsLoading(false);
      } catch (error: unknown) {
        if (signal?.aborted) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "The invoices could not be loaded.",
        );
        setIsLoading(false);
      }
    },
    [
      appliedSearch,
      hasDefaultedPeriod,
      page,
      selectedLate,
      selectedPeriods,
      selectedStatuses,
    ],
  );

  useEffect(() => {
    const timer = window.setTimeout(
      () => setAppliedSearch(search.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    void loadInvoices(controller.signal);
    return () => controller.abort();
  }, [loadInvoices]);

  function changeFilter(id: string, selected: string[]) {
    setPage(1);
    setFilters((current) => ({ ...current, [id]: selected }));
  }

  const periodLabel =
    selectedPeriods.length === 1
      ? formatBillingPeriod(selectedPeriods[0])
      : "all periods";

  const collectedShare =
    summary.billed > 0
      ? Math.round((summary.received / summary.billed) * 100)
      : 0;
  const isEmpty = !isLoading && !loadError && invoices.length === 0;

  return (
    <PageContainer>
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Invoices</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Invoices for {periodLabel} · open an invoice to see its full breakdown
        </p>
      </div>

      {!loadError && summary.billingPeriod ? (
        <section className="grid gap-2.5">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile
              label={`Billed for ${formatBillingPeriod(summary.billingPeriod)}`}
              value={summary.billed}
              format={formatCurrency}
            />
            <StatTile
              label="Money received"
              value={summary.received}
              format={formatCurrency}
              hint={`${collectedShare}% of total billed`}
            />
            <StatTile
              label="Still owed to you"
              value={summary.stillOwed}
              format={formatCurrency}
              highlight
            />
          </div>
        </section>
      ) : null}

      <SearchFilter
        searchValue={search}
        onSearchChange={(value) => {
          setPage(1);
          setSearch(value);
        }}
        searchPlaceholder="Search by invoice ID, room or tenant..."
        searchLabel="Search invoices"
        filters={[
          {
            id: PERIOD_FILTER_ID,
            label: "Billing month",
            selected: selectedPeriods,
            options: billingPeriods.map((period) => ({
              value: period,
              label: formatBillingPeriod(period),
            })),
          },
          {
            id: STATUS_FILTER_ID,
            label: "Status",
            selected: selectedStatuses,
            options: [
              { value: "not_paid", label: "Not paid" },
              { value: "paid", label: "Paid" },
            ],
          },
          // {
          //   id: LATE_FILTER_ID,
          //   label: "Late payment",
          //   selected: selectedLate,
          //   options: [
          //     { value: "yes", label: "Allowed to pay late" },
          //     { value: "no", label: "No late payment" },
          //   ],
          // },
        ]}
        onFilterChange={changeFilter}
        onClearFilters={() => {
          setPage(1);
          setFilters({
            [PERIOD_FILTER_ID]: [],
            [STATUS_FILTER_ID]: [],
            [LATE_FILTER_ID]: [],
          });
        }}
        resultCount={invoices.length}
        totalCount={pagination.totalItems}
        itemNoun="invoice"
      />

      {isLoading ? (
        <PageLoading
          title="Loading invoices"
          description="Collecting invoices from every room..."
        />
      ) : null}

      {loadError ? (
        <ErrorState
          description={loadError}
          onRetry={() => void loadInvoices()}
        />
      ) : null}

      {isEmpty ? (
        <EmptyState
          title="No matching invoices"
          description="Adjust the search or the filters to find another billing period."
        />
      ) : null}

      {!isLoading && !loadError && invoices.length > 0 ? (
        <>
          <div className="overflow-hidden rounded-lg border border-hairline bg-surface">
            <Table className="min-w-[1060px]">
              <TableHeader className="bg-muted">
                <TableRow className="hover:bg-muted">
                  <TableHead className="px-4">Invoice ID</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Billing month</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Billed</TableHead>
                  <TableHead className="text-right">Still owed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow
                    key={invoice.invoiceID}
                    className="cursor-pointer"
                    onClick={() =>
                      void navigate(
                        ROUTES.admin.invoiceDetailsLink(invoice.invoiceID),
                      )
                    }
                  >
                    <TableCell className="px-4 font-medium text-foreground">
                      {invoice.displayID}
                    </TableCell>
                    <TableCell>{invoice.roomCode}</TableCell>
                    <TableCell>{invoice.tenantName || "—"}</TableCell>
                    <TableCell>
                      {formatBillingPeriod(invoice.billingPeriod)}
                    </TableCell>
                    <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(invoice.totalBill)}
                    </TableCell>
                    <TableCell className="text-right">
                      {invoice.stillOwed > 0 ? (
                        <span className="font-medium text-status-danger-fg">
                          {formatCurrency(invoice.stillOwed)}
                        </span>
                      ) : (
                        "₫ 0"
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge domain="invoice" status={invoice.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {invoice.status === "not_paid" && invoice.isOverdue ? (
                          <span className="rounded-full bg-status-danger-bg px-2 py-0.5 text-xs font-medium text-status-danger-fg">
                            Overdue
                          </span>
                        ) : null}
                        {invoice.isRequestLate ? (
                          <span className="rounded-full bg-status-info-bg px-2 py-0.5 text-xs font-medium text-status-info-fg">
                            Late allowed
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            itemNoun="invoice"
            isBusy={isLoading}
            onPageChange={setPage}
          />
        </>
      ) : null}

      <Outlet />
    </PageContainer>
  );
}

export { InvoicesPage };
