import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { EmptyState, ErrorState, PageLoading } from "@/components/feedback";
import { PageContainer } from "@/components/layout";
import { StatusBadge } from "@/components/status";
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
import { getTenantInvoices } from "@/shared/api/user/invoices.api";
import { useAuth } from "@/shared/auth/useAuth";
import type { TenantInvoice } from "@/shared/types/invoice";
import { formatDate, formatMonthYear } from "@/shared/utils/dateFormatter";
import { formatCurrency } from "@/shared/utils/currencyFormatter";

function InvoiceListPage() {
  const navigate = useNavigate();
  const { account } = useAuth();
  const [invoices, setInvoices] = useState<TenantInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string[]>>({
    status: [],
    year: [],
  });

  async function loadInvoices() {
    setIsLoading(true);
    setLoadError("");

    try {
      setInvoices(await getTenantInvoices());
    } catch {
      setLoadError("Your invoices could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    getTenantInvoices(controller.signal)
      .then((loadedInvoices) => setInvoices(loadedInvoices))
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoadError("Your invoices could not be loaded.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, []);

  const years = useMemo(() => {
    const found = new Set(
      invoices.map((invoice) => String(new Date(`${invoice.billingMonth ?? invoice.createDate.slice(0, 7)}-01`).getFullYear())),
    );

    return Array.from(found).sort((left, right) => right.localeCompare(left));
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const billingMonth = formatMonthYear(`${invoice.billingMonth ?? invoice.createDate.slice(0, 7)}-01`).toLowerCase();
      const matchesSearch =
        !normalizedSearch ||
        invoice.displayID.toLowerCase().includes(normalizedSearch) ||
        billingMonth.includes(normalizedSearch);
      const matchesStatus =
        filters.status.length === 0 || filters.status.includes(invoice.status);
      const matchesYear =
        filters.year.length === 0 ||
        filters.year.includes(String(new Date(`${invoice.billingMonth ?? invoice.createDate.slice(0, 7)}-01`).getFullYear()));

      return matchesSearch && matchesStatus && matchesYear;
    });
  }, [filters, invoices, search]);

  return (
    <PageContainer>
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Invoices</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {account?.username ? `Room ${account.username} · ` : ""}newest billing
          month first
        </p>
      </div>

      <SearchFilter
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by invoice ID or billing month..."
        searchLabel="Search invoices"
        filters={[
          {
            id: "status",
            label: "Status",
            selected: filters.status,
            options: [
              { value: "not_paid", label: "Not paid" },
              { value: "paid", label: "Paid" },
            ],
          },
          {
            id: "year",
            label: "Year",
            selected: filters.year,
            options: years.map((year) => ({ value: year, label: year })),
          },
        ]}
        onFilterChange={(id, selected) =>
          setFilters((current) => ({ ...current, [id]: selected }))
        }
        onClearFilters={() => setFilters({ status: [], year: [] })}
        resultCount={filteredInvoices.length}
        totalCount={invoices.length}
        itemNoun="invoice"
      />

      {isLoading ? (
        <PageLoading
          title="Loading invoices"
          description="Fetching your billing history..."
        />
      ) : null}

      {loadError ? (
        <ErrorState
          description={loadError}
          onRetry={() => void loadInvoices()}
        />
      ) : null}

      {!isLoading && !loadError && invoices.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          description="Invoices appear here once the owner issues the first one for your room."
        />
      ) : null}

      {!isLoading && !loadError && invoices.length > 0 ? (
        filteredInvoices.length === 0 ? (
          <EmptyState
            title="No invoices match these filters"
            description="Change or clear a filter to see more invoices."
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-hairline bg-surface">
            <Table className="min-w-[680px]">
              <TableHeader className="bg-muted">
                <TableRow className="hover:bg-muted">
                  <TableHead className="px-4">Invoice ID</TableHead>
                  <TableHead>Billing month</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead className="pr-4">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow
                    key={invoice.invoiceID}
                    tabIndex={0}
                    role="link"
                    aria-label={`Open invoice ${invoice.displayID}`}
                    className="cursor-pointer"
                    onClick={() =>
                      navigate(
                        ROUTES.user.invoiceDetailsLink(invoice.invoiceID),
                      )
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(
                          ROUTES.user.invoiceDetailsLink(invoice.invoiceID),
                        );
                      }
                    }}
                  >
                    <TableCell className="px-4 font-medium">
                      {invoice.displayID}
                    </TableCell>
                    <TableCell>{formatMonthYear(`${invoice.billingMonth ?? invoice.createDate.slice(0, 7)}-01`)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(invoice.totalBill)}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        {formatDate(invoice.dueDate)}
                        {invoice.isOverdue ? (
                          <span className="rounded-full bg-status-danger-bg px-2 py-0.5 text-xs font-medium text-status-danger-fg">
                            Overdue
                          </span>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell className="pr-4">
                      <StatusBadge domain="invoice" status={invoice.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      ) : null}
    </PageContainer>
  );
}

export { InvoiceListPage };
