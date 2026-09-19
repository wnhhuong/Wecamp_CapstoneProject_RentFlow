import { useEffect, useMemo, useState } from "react";

import { EmptyState, ErrorState, PageLoading } from "@/components/feedback";
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
  USERS_PAGE_SIZE,
  getAdminUsers,
} from "@/shared/api/admin/users.api";
import type { AdminUser, AdminUserQuery } from "@/shared/types/admin/user";
import type { ApiPagination } from "@/shared/types/api";
import { formatDate } from "@/shared/utils/dateFormatter";
import { SEX_LABELS } from "@/shared/utils/sexLabels";

const LEASE_FILTER_ID = "lease";
const SEARCH_DEBOUNCE_MS = 300;

const EMPTY_PAGINATION: ApiPagination = {
  page: 1,
  limit: USERS_PAGE_SIZE,
  totalItems: 0,
  totalPages: 1,
};

function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<ApiPagination>(EMPTY_PAGINATION);
  // Opens on who is renting now; the rest are a deliberate click away.
  const [filters, setFilters] = useState<Record<string, string[]>>({
    [LEASE_FILTER_ID]: ["active"],
  });
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const selectedLease = filters[LEASE_FILTER_ID] ?? [];

  const query = useMemo<AdminUserQuery>(() => {
    const lease = filters[LEASE_FILTER_ID] ?? [];

    return {
      search: appliedSearch || undefined,
      // Picking both sides is the same as picking neither.
      lease:
        lease.length === 1
          ? lease[0] === "active"
            ? "active"
            : "expired"
          : undefined,
      page,
      limit: USERS_PAGE_SIZE,
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

    getAdminUsers(query, controller.signal)
      .then((result) => {
        setUsers(result.items);
        setPagination(result.pagination);
        setLoadError("");
        setIsLoading(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "The tenants could not be loaded.",
        );
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

  const isEmpty = !isLoading && !loadError && users.length === 0;
  const scopeLabel =
    selectedLease.length === 1
      ? selectedLease[0] === "active"
        ? "Everyone renting a room right now"
        : "Everyone whose lease has ended"
      : "Everyone who has signed a lease";

  return (
    <PageContainer>
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Users</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {scopeLabel}, with the details they gave you
        </p>
      </div>

      <SearchFilter
        searchValue={search}
        onSearchChange={(value) => {
          setPage(1);
          setSearch(value);
        }}
        searchPlaceholder="Search by name, phone, ID number or room..."
        searchLabel="Search users"
        filters={[
          {
            id: LEASE_FILTER_ID,
            label: "Lease",
            selected: selectedLease,
            options: [
              { value: "active", label: "Active" },
              { value: "expired", label: "Expired" },
            ],
          },
        ]}
        onFilterChange={changeFilter}
        onClearFilters={() => {
          setPage(1);
          setFilters({ [LEASE_FILTER_ID]: [] });
        }}
        resultCount={users.length}
        totalCount={pagination.totalItems}
        itemNoun="user"
      />

      {isLoading ? (
        <PageLoading
          title="Loading users"
          description="Collecting everyone on the tenant list..."
        />
      ) : null}

      {loadError ? <ErrorState description={loadError} onRetry={retry} /> : null}

      {isEmpty ? (
        <EmptyState
          title="No matching users"
          description="Adjust the search or the lease filter to find someone else."
        />
      ) : null}

      {!isLoading && !loadError && users.length > 0 ? (
        <>
          <div className="overflow-hidden rounded-lg border border-hairline bg-surface">
            <Table className="min-w-[1280px]">
              <TableHeader className="bg-muted">
                <TableRow className="hover:bg-muted">
                  <TableHead className="sticky left-0 z-20 bg-muted px-4">
                    Full name
                  </TableHead>
                  <TableHead>Lease</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Identity no.</TableHead>
                  <TableHead>Date of birth</TableHead>
                  <TableHead>Sex</TableHead>
                  <TableHead>Nationality</TableHead>
                  <TableHead>Place of residence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.userID} className="group hover:bg-muted">
                    <TableCell
                      className="sticky left-0 z-10 bg-surface px-4 font-medium text-foreground transition-colors group-hover:bg-muted"
                    >
                      {user.fullName}
                    </TableCell>
                    <TableCell>
                      {user.contractStatus ? (
                        <StatusBadge
                          domain="contract"
                          status={user.contractStatus}
                        />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{user.roomCode ?? "—"}</TableCell>
                    <TableCell>{user.phoneNumber || "—"}</TableCell>
                    <TableCell>{user.identityNo || "—"}</TableCell>
                    <TableCell>
                      {user.dob ? formatDate(user.dob) : "—"}
                    </TableCell>
                    <TableCell>{SEX_LABELS[user.sex]}</TableCell>
                    <TableCell>{user.nationality || "—"}</TableCell>
                    <TableCell>{user.placeOfResidence || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            itemNoun="user"
            isBusy={isLoading}
            onPageChange={goToPage}
          />
        </>
      ) : null}
    </PageContainer>
  );
}

export { UsersPage };
