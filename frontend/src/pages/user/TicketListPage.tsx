import { useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router";

import { EmptyState, ErrorState, PageLoading } from "@/components/feedback";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@/components/ui/icons";
import { StatusBadge } from "@/components/status";
import { Pagination } from "@/components/ui/pagination";
import { SearchFilter } from "@/components/ui/search-filter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TICKETS_PAGE_SIZE,
  getTenantTickets,
} from "@/shared/api/user/tickets.api";

import { NewTicketDialog } from "./tickets/NewTicketDialog";
import { ROUTES } from "@/router/routes";
import type { ApiPagination } from "@/shared/types/api";
import type { TenantTicket, TenantTicketQuery } from "@/shared/types/ticket";
import { formatDateShort } from "@/shared/utils/dateFormatter";
import { TICKET_TYPE_OPTIONS } from "@/shared/utils/ticketTypes";

const STATUS_FILTER_ID = "status";
const TYPE_FILTER_ID = "type";
const SEARCH_DEBOUNCE_MS = 300;

const EMPTY_PAGINATION: ApiPagination = {
  page: 1,
  limit: TICKETS_PAGE_SIZE,
  totalItems: 0,
  totalPages: 1,
};

function TicketListPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<TenantTicket[]>([]);
  const [pagination, setPagination] = useState<ApiPagination>(EMPTY_PAGINATION);
  const [filters, setFilters] = useState<Record<string, string[]>>({
    [STATUS_FILTER_ID]: [],
    [TYPE_FILTER_ID]: [],
  });
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);

  const selectedStatuses = filters[STATUS_FILTER_ID] ?? [];
  const selectedTypes = filters[TYPE_FILTER_ID] ?? [];

  const query = useMemo<TenantTicketQuery>(() => {
    const statuses = filters[STATUS_FILTER_ID] ?? [];
    const types = filters[TYPE_FILTER_ID] ?? [];

    return {
      search: appliedSearch || undefined,
      // The backend takes one value per filter, so picking several is the same
      // as picking none.
      status: statuses.length === 1 ? toStatus(statuses[0]) : undefined,
      type: types.length === 1 ? toType(types[0]) : undefined,
      page,
      limit: TICKETS_PAGE_SIZE,
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

    getTenantTickets(query, controller.signal)
      .then((result) => {
        setTickets(result.items);
        setPagination(result.pagination);
        setLoadError("");
        setIsLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setLoadError("Your tickets could not be loaded.");
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [query, reloadToken]);

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

  const isFiltered =
    appliedSearch !== "" ||
    selectedStatuses.length > 0 ||
    selectedTypes.length > 0;
  const isEmpty = !isLoading && !loadError && tickets.length === 0;

  return (
    <PageContainer>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Tickets</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Repairs and complaints from your current lease, newest first
          </p>
        </div>
        <Button
          type="button"
          variant="dark"
          onClick={() => setIsNewTicketOpen(true)}
        >
          <PlusIcon />
          New ticket
        </Button>
      </div>

      <SearchFilter
        searchValue={search}
        onSearchChange={(value) => {
          setPage(1);
          setSearch(value);
        }}
        searchPlaceholder="Search by ticket ID, description or place..."
        searchLabel="Search tickets"
        filters={[
          {
            id: STATUS_FILTER_ID,
            label: "Status",
            selected: selectedStatuses,
            options: [
              { value: "need_action", label: "Need action" },
              { value: "in_progress", label: "In progress" },
              { value: "done", label: "Done" },
            ],
          },
          {
            id: TYPE_FILTER_ID,
            label: "Type",
            selected: selectedTypes,
            options: TICKET_TYPE_OPTIONS,
          },
        ]}
        onFilterChange={changeFilter}
        onClearFilters={() => {
          setPage(1);
          setFilters({ [STATUS_FILTER_ID]: [], [TYPE_FILTER_ID]: [] });
        }}
        resultCount={tickets.length}
        totalCount={pagination.totalItems}
        itemNoun="ticket"
      />

      {isLoading ? (
        <PageLoading
          title="Loading your tickets"
          description="Fetching what you reported to the owner..."
        />
      ) : null}

      {loadError ? <ErrorState description={loadError} onRetry={retry} /> : null}

      {isEmpty && isFiltered ? (
        <EmptyState
          title="No matching tickets"
          description="Adjust the search or the filters to see another ticket."
        />
      ) : null}

      {isEmpty && !isFiltered ? (
        <EmptyState
          title="No tickets yet"
          description="Repairs and complaints you report to the owner appear here."
        />
      ) : null}

      {!isLoading && !loadError && tickets.length > 0 ? (
        <>
          <div className="overflow-hidden rounded-lg border border-hairline bg-surface">
            <Table className="min-w-[900px]">
              <TableHeader className="bg-muted">
                <TableRow className="hover:bg-muted">
                  <TableHead
                    className="sticky left-0 z-20 w-[210px] min-w-[210px] max-w-[210px] bg-muted px-4"
                  >
                    Ticket ID
                  </TableHead>
                  <TableHead className="sticky left-[210px] z-20 bg-muted">
                    Type
                  </TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Raised</TableHead>
                  <TableHead>Resolved</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow
                    key={ticket.ticketID}
                    tabIndex={0}
                    role="link"
                    aria-label={`Open ticket ${ticket.displayID}`}
                    className="group cursor-pointer hover:bg-muted focus-visible:outline-2 focus-visible:outline-brand"
                    onClick={() => void navigate(ROUTES.user.ticketDetailsLink(ticket.ticketID))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        void navigate(ROUTES.user.ticketDetailsLink(ticket.ticketID));
                      }
                    }}
                  >
                    <TableCell
                      className="sticky left-0 z-10 w-[210px] min-w-[210px] max-w-[210px] bg-surface px-4 font-medium text-foreground transition-colors group-hover:bg-muted"
                    >
                      {ticket.displayID}
                    </TableCell>
                    <TableCell className="sticky left-[210px] z-10 bg-surface transition-colors group-hover:bg-muted">
                      <StatusBadge domain="ticketType" status={ticket.type} />
                    </TableCell>
                    <TableCell className="max-w-[340px]">
                      <span className="block truncate">{ticket.description || "—"}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge domain="ticket" status={ticket.status} />
                    </TableCell>
                    <TableCell>{formatDateShort(ticket.createDate)}</TableCell>
                    <TableCell>
                      {ticket.resolveDate
                        ? formatDateShort(ticket.resolveDate)
                        : "—"}
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
            itemNoun="ticket"
            isBusy={isLoading}
            onPageChange={goToPage}
          />
        </>
      ) : null}

      <NewTicketDialog
        open={isNewTicketOpen}
        onOpenChange={setIsNewTicketOpen}
        onCreated={() => {
          setIsLoading(true);
          setPage(1);
          setReloadToken((token) => token + 1);
        }}
      />
      <Outlet />
    </PageContainer>
  );
}

function toStatus(value: string): TenantTicketQuery["status"] {
  if (value === "done" || value === "in_progress") return value;
  return "need_action";
}

function toType(value: string): TenantTicketQuery["type"] {
  return value === "complain" ? "complain" : "repair";
}

export { TicketListPage };
