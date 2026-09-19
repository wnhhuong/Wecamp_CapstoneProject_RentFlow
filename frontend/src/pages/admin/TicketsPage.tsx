import { useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router";

import { EmptyState, ErrorState, PageLoading } from "@/components/feedback";
import { ROUTES } from "@/router/routes";
import { PageContainer } from "@/components/layout";
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
  ADMIN_TICKETS_PAGE_SIZE,
  getAdminTickets,
} from "@/shared/api/admin/tickets.api";
import type {
  AdminTicket,
  AdminTicketQuery,
} from "@/shared/types/admin/ticket";
import type { ApiPagination } from "@/shared/types/api";
import { formatDateShort } from "@/shared/utils/dateFormatter";
import { TICKET_TYPE_OPTIONS } from "@/shared/utils/ticketTypes";


const STATUS_FILTER_ID = "status";
const TYPE_FILTER_ID = "type";
const SEARCH_DEBOUNCE_MS = 300;

const EMPTY_PAGINATION: ApiPagination = {
  page: 1,
  limit: ADMIN_TICKETS_PAGE_SIZE,
  totalItems: 0,
  totalPages: 1,
};

function TicketsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [updatedTicket, setUpdatedTicket] = useState<AdminTicket | null>(null);
  const [pagination, setPagination] = useState<ApiPagination>(EMPTY_PAGINATION);
  const [filters, setFilters] = useState<Record<string, string[]>>({
    [STATUS_FILTER_ID]: ["need_action"],
    [TYPE_FILTER_ID]: [],
  });
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const selectedStatuses = filters[STATUS_FILTER_ID] ?? [];
  const selectedTypes = filters[TYPE_FILTER_ID] ?? [];

  const query = useMemo<AdminTicketQuery>(() => {
    const statuses = filters[STATUS_FILTER_ID] ?? [];
    const types = filters[TYPE_FILTER_ID] ?? [];

    return {
      search: appliedSearch || undefined,
      status: statuses.length === 1 ? toStatus(statuses[0]) : undefined,
      type: types.length === 1 ? toType(types[0]) : undefined,
      page,
      limit: ADMIN_TICKETS_PAGE_SIZE,
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

    getAdminTickets(query, controller.signal)
      .then((result) => {
        setTickets(result.items);
        setPagination(result.pagination);
        setLoadError("");
        setIsLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setLoadError("The tickets could not be loaded.");
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

  function reload() {
    setReloadToken((token) => token + 1);
  }

  function applyUpdate(updated: AdminTicket) {
    setUpdatedTicket(updated);
    setTickets((current) =>
      current.map((ticket) =>
        ticket.ticketID === updated.ticketID ? updated : ticket,
      ),
    );
    reload();
  }

  /**
   * The drawer reads its ticket from this list, and `reload` refetches under the
   * current filter, which the ticket just stopped matching. Keep serving it so
   * the drawer stays open on the status the admin just set.
   */
  const drawerTickets = useMemo(() => {
    if (!updatedTicket) return tickets;
    const isListed = tickets.some(
      (ticket) => ticket.ticketID === updatedTicket.ticketID,
    );
    return isListed ? tickets : [...tickets, updatedTicket];
  }, [tickets, updatedTicket]);

  const isEmpty = !isLoading && !loadError && tickets.length === 0;

  return (
    <PageContainer>
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Tickets</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Repairs and complaints from every room · open one to move it along
        </p>
      </div>

      <SearchFilter
        searchValue={search}
        onSearchChange={(value) => {
          setPage(1);
          setSearch(value);
        }}
        searchPlaceholder="Search by ticket ID, room, description or place..."
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
          title="Loading tickets"
          description="Collecting what tenants have reported..."
        />
      ) : null}

      {loadError ? <ErrorState description={loadError} onRetry={reload} /> : null}

      {isEmpty ? (
        <EmptyState
          title="No matching tickets"
          description="Adjust the search or the filters to see another ticket."
        />
      ) : null}

      {!isLoading && !loadError && tickets.length > 0 ? (
        <>
          <div className="overflow-hidden rounded-lg border border-hairline bg-surface">
            <Table className="min-w-[1060px]">
              <TableHeader className="bg-muted">
                <TableRow className="hover:bg-muted">
                  <TableHead className="px-4">Ticket ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Where</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Raised</TableHead>
                  <TableHead>Resolved</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow
                    key={ticket.ticketID}
                    className="cursor-pointer"
                    onClick={() =>
                      void navigate(
                        ROUTES.admin.ticketDetailsLink(ticket.ticketID),
                      )
                    }
                  >
                    <TableCell className="px-4 font-medium text-foreground">
                      {ticket.displayID}
                    </TableCell>
                    <TableCell>
                      <StatusBadge domain="ticketType" status={ticket.type} />
                    </TableCell>
                    <TableCell>{ticket.roomCode || "—"}</TableCell>
                    <TableCell className="max-w-[320px] truncate">
                      {ticket.description || "—"}
                    </TableCell>
                    <TableCell>{ticket.location || "—"}</TableCell>
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

      <Outlet context={{ tickets: drawerTickets, onUpdated: applyUpdate }} />
    </PageContainer>
  );
}

function toStatus(value: string): AdminTicketQuery["status"] {
  if (value === "done" || value === "in_progress") return value;
  return "need_action";
}

function toType(value: string): AdminTicketQuery["type"] {
  return value === "complain" ? "complain" : "repair";
}

export { TicketsPage };
