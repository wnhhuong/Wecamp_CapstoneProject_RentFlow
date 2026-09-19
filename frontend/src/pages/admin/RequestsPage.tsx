import { useEffect, useMemo, useState } from "react";

import { EmptyState, ErrorState, PageLoading } from "@/components/feedback";
import { PageContainer } from "@/components/layout";
import { StatusBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { RefreshIcon } from "@/components/ui/icons";
import { SearchFilter } from "@/components/ui/search-filter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAdminRequests } from "@/shared/api/admin/requests.api";
import type { AdminRequest } from "@/shared/types/admin/request";
import { formatDateShort } from "@/shared/utils/dateFormatter";
import {
  REQUEST_TYPE_LABELS,
  REQUEST_TYPE_OPTIONS,
} from "@/shared/utils/requestTypes";

import { RequestDetailsSheet } from "./requests/RequestDetailsSheet";


const STATUS_FILTER_ID = "status";
const TYPE_FILTER_ID = "type";

function RequestsPage() {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [openedRequest, setOpenedRequest] = useState<AdminRequest | null>(null);
  const [filters, setFilters] = useState<Record<string, string[]>>({
    [STATUS_FILTER_ID]: ["pending"],
    [TYPE_FILTER_ID]: [],
  });
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  async function loadRequests() {
    setIsLoading(true);
    setLoadError("");

    try {
      setRequests(await getAdminRequests());
    } catch {
      setLoadError("The request queue could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isActive = true;

    getAdminRequests()
      .then((loadedRequests) => {
        if (isActive) setRequests(loadedRequests);
      })
      .catch(() => {
        if (isActive) setLoadError("The request queue could not be loaded.");
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const filteredRequests = useMemo(() => {
    const selectedStatuses = filters[STATUS_FILTER_ID] ?? [];
    const selectedTypes = filters[TYPE_FILTER_ID] ?? [];
    const normalizedSearch = search.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesStatus =
        selectedStatuses.length === 0 ||
        selectedStatuses.includes(request.status);
      const matchesType =
        selectedTypes.length === 0 || selectedTypes.includes(request.type);
      const matchesSearch =
        !normalizedSearch ||
        request.displayID.toLowerCase().includes(normalizedSearch) ||
        request.roomCode.toLowerCase().includes(normalizedSearch) ||
        request.tenantName.toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesType && matchesSearch;
    });
  }, [filters, requests, search]);

  const pendingCount = requests.filter(
    (request) => request.status === "pending",
  ).length;
  const approvedCount = requests.filter(
    (request) => request.status === "approved",
  ).length;

  return (
    <PageContainer>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Requests</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {pendingCount} pending · {approvedCount} approved · open a request
            to review what the tenant submitted
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => void loadRequests()}
          disabled={isLoading}
        >
          <RefreshIcon />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <PageLoading
          title="Loading requests"
          description="Collecting requests from every room..."
        />
      ) : null}

      {loadError ? (
        <ErrorState
          description={loadError}
          onRetry={() => void loadRequests()}
        />
      ) : null}

      {!isLoading && !loadError && requests.length === 0 ? (
        <EmptyState
          title="No requests yet"
          description="Requests submitted by tenants will appear here."
        />
      ) : null}

      {!isLoading && !loadError && requests.length > 0 ? (
        <>
          <SearchFilter
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by request ID, room or tenant..."
            searchLabel="Search requests"
            filters={[
              {
                id: STATUS_FILTER_ID,
                label: "Status",
                selected: filters[STATUS_FILTER_ID] ?? [],
                options: [
                  { value: "pending", label: "Pending" },
                  { value: "approved", label: "Approved" },
                ],
              },
              {
                id: TYPE_FILTER_ID,
                label: "Type",
                selected: filters[TYPE_FILTER_ID] ?? [],
                options: REQUEST_TYPE_OPTIONS,
              },
            ]}
            onFilterChange={(id, selected) =>
              setFilters((current) => ({ ...current, [id]: selected }))
            }
            onClearFilters={() =>
              setFilters({ [STATUS_FILTER_ID]: [], [TYPE_FILTER_ID]: [] })
            }
            resultCount={filteredRequests.length}
            totalCount={requests.length}
            itemNoun="request"
          />

          {filteredRequests.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-hairline bg-surface">
              <Table className="min-w-[860px]">
                <TableHeader className="bg-muted">
                  <TableRow className="hover:bg-muted">
                    <TableHead className="px-4">Request ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Resolved</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow
                      key={request.requestID}
                      className="cursor-pointer"
                      onClick={() => setOpenedRequest(request)}
                    >
                      <TableCell className="px-4 font-medium text-foreground">
                        {request.displayID}
                      </TableCell>
                      <TableCell>{REQUEST_TYPE_LABELS[request.type]}</TableCell>
                      <TableCell>{request.roomCode}</TableCell>
                      <TableCell>{request.tenantName}</TableCell>
                      <TableCell>{formatDateShort(request.createDate)}</TableCell>
                      <TableCell>
                        {request.resolveDate
                          ? formatDateShort(request.resolveDate)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge domain="request" status={request.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              title="No matching requests"
              description="Adjust the filters to review another request."
            />
          )}
        </>
      ) : null}

      <RequestDetailsSheet
        request={openedRequest}
        onOpenChange={(open) => {
          if (!open) setOpenedRequest(null);
        }}
        onApproved={() => void loadRequests()}
      />
    </PageContainer>
  );
}

export { RequestsPage };
