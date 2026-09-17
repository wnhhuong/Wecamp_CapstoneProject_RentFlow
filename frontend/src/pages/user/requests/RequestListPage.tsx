import { useEffect, useMemo, useState } from "react";

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
import { getTenantRequests } from "@/shared/api/user/requests.api";
import type { TenantRequest } from "@/shared/types/request";
import { formatDate } from "@/shared/utils/dateFormatter";
import {
  REQUEST_TYPE_LABELS,
  REQUEST_TYPE_OPTIONS,
} from "@/shared/utils/requestTypes";

import { RequestDetailsSheet } from "./RequestDetailsSheet";

const STATUS_FILTER_ID = "status";
const TYPE_FILTER_ID = "type";

function RequestListPage() {
  const [requests, setRequests] = useState<TenantRequest[]>([]);
  const [openedRequest, setOpenedRequest] = useState<TenantRequest | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string[]>>({
    [STATUS_FILTER_ID]: [],
    [TYPE_FILTER_ID]: [],
  });

  async function loadRequests() {
    setIsLoading(true);
    setLoadError("");

    try {
      setRequests(await getTenantRequests());
    } catch {
      setLoadError("Your requests could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    getTenantRequests(controller.signal)
      .then((loadedRequests) => setRequests(loadedRequests))
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoadError("Your requests could not be loaded.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
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
        REQUEST_TYPE_LABELS[request.type]
          .toLowerCase()
          .includes(normalizedSearch);

      return matchesStatus && matchesType && matchesSearch;
    });
  }, [filters, requests, search]);

  return (
    <PageContainer>
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Requests</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Everything you sent the owner, newest first
        </p>
      </div>

      {isLoading ? (
        <PageLoading
          title="Loading your requests"
          description="Fetching what you sent the owner..."
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
          description="Meter readings, payment notices and lease requests you send appear here."
        />
      ) : null}

      {!isLoading && !loadError && requests.length > 0 ? (
        <>
          <SearchFilter
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by request ID or type..."
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
              <Table className="min-w-[680px]">
                <TableHeader className="bg-muted">
                  <TableRow className="hover:bg-muted">
                    <TableHead className="px-4">Request ID</TableHead>
                    <TableHead>Type</TableHead>
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
                      <TableCell>{formatDate(request.createDate)}</TableCell>
                      <TableCell>
                        {request.resolveDate
                          ? formatDate(request.resolveDate)
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
              description="Adjust the filters to see another request."
            />
          )}
        </>
      ) : null}

      <RequestDetailsSheet
        request={openedRequest}
        onOpenChange={(open) => {
          if (!open) setOpenedRequest(null);
        }}
      />
    </PageContainer>
  );
}

export { RequestListPage };
