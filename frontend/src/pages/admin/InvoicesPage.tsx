import { useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useNavigate, useSearchParams } from "react-router";

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
  AdminInvoiceQuery,
  AdminInvoiceSummary,
} from "@/shared/types/admin/invoice";
import type { ApiPagination } from "@/shared/types/api";
import { formatCurrency } from "@/shared/utils/currencyFormatter";
import {
  formatBillingPeriod,
  formatBillingPeriodShort,
  formatDateShort,
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
  const [searchParams] = useSearchParams();
  const overdueOnly = searchParams.get("overdue") === "true";
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
    [PERIOD_FILTER_ID]: overdueOnly ? [] : [],
    [STATUS_FILTER_ID]: overdueOnly ? ["not_paid"] : [],
    [LATE_FILTER_ID]: [],
  });
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const hasDefaultedPeriod = useRef(false);

  const selectedPeriods = filters[PERIOD_FILTER_ID] ?? [];
  const selectedStatuses = filters[STATUS_FILTER_ID] ?? [];

  const query = useMemo<AdminInvoiceQuery>(() => {
    const periods = filters[PERIOD_FILTER_ID] ?? [];
    const statuses = filters[STATUS_FILTER_ID] ?? [];
    const late = filters[LATE_FILTER_ID] ?? [];

    return {
      search: appliedSearch || undefined,
      billingPeriod: periods.length === 1 ? periods[0] : undefined,
      status:
        statuses.length === 1
          ? statuses[0] === "paid"
            ? "paid"
            : "not_paid"
          : undefined,
      isRequestLate: late.length === 1 ? late[0] === "yes" : undefined,
      page,
      limit: PAGE_SIZE,
    };
  }, [appliedSearch, filters, page]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setAppliedSearch(search.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();

    getAdminInvoices(query, controller.signal)
      .then((result) => {
        setInvoices(overdueOnly ? result.items.filter((invoice) => invoice.isOverdue && invoice.status === "not_paid") : result.items);
        setPagination(result.pagination);
        setBillingPeriods(result.billingPeriods);
        setSummary(result.summary);
        setLoadError("");

        // The newest period is only known once the first response lands, so the
        // default month filter is applied after it rather than on mount.
        if (!hasDefaultedPeriod.current) {
          hasDefaultedPeriod.current = true;
          if (!overdueOnly && result.billingPeriods.length > 0) {
            setFilters((current) => ({
              ...current,
              [PERIOD_FILTER_ID]: [result.billingPeriods[0]],
            }));
            return;
          }
        }

        setIsLoading(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "The invoices could not be loaded.",
        );
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [overdueOnly, query, reloadToken]);

  function changeFilter(id: string, selected: string[]) {
    setIsLoading(true);
    setPage(1);
    setFilters((current) => ({ ...current, [id]: selected }));
  }

  function goToPage(nextPage: number) {
    setIsLoading(true);
    setPage(nextPage);
  }

  function retry() {
    setIsLoading(true);
    setLoadError("");
    setReloadToken((token) => token + 1);
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

      {overdueOnly ? <div className="rounded-md border border-status-danger-border bg-status-danger-bg px-4 py-3 text-sm text-status-danger-fg">Showing overdue invoices only.</div> : null}

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
          onRetry={retry}
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
                      {formatBillingPeriodShort(invoice.billingPeriod)}
                    </TableCell>
                    <TableCell>{formatDateShort(invoice.dueDate)}</TableCell>
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
            onPageChange={goToPage}
          />
        </>
      ) : null}

      <Outlet />
    </PageContainer>
  );
}

export { InvoicesPage };
