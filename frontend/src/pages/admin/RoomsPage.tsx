import { useEffect, useMemo, useState } from "react";

import { EmptyState, ErrorState, PageLoading } from "@/components/feedback";
import { PageContainer } from "@/components/layout";
import { StatusBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { CloseIcon, EyeIcon, KeyIcon, PlusIcon } from "@/components/ui/icons";
import { SearchFilter } from "@/components/ui/search-filter";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAdminRooms } from "@/shared/api/admin/rooms.api";
import type { AdminRoom } from "@/shared/types/admin/room";
import { formatCurrency } from "@/shared/utils/currencyFormatter";

import { AddRoomDialog } from "./rooms/AddRoomDialog";
import { EditRoomDialog } from "./rooms/EditRoomDialog";
import { PrepareRoomAccountDialog } from "./rooms/PrepareRoomAccountDialog";
import { RoomDetailsSheet } from "./rooms/RoomDetailsSheet";
import { getAreasFromRooms } from "./rooms/utils/getAreasFromRooms";

function RoomsPage() {
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [selectedRoomID, setSelectedRoomID] = useState<string | null>(null);
  const [detailRoomID, setDetailRoomID] = useState<string | null>(null);
  const [editRoomID, setEditRoomID] = useState<string | null>(null);
  const [createdRoomCode, setCreatedRoomCode] = useState("");
  const [updatedRoomCode, setUpdatedRoomCode] = useState("");
  const [preparedUsername, setPreparedUsername] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string[]>>({
    area: [],
    status: [],
    capacity: [],
    balance: [],
  });

  async function loadRooms() {
    setIsLoading(true);
    setLoadError("");

    try {
      setRooms(await getAdminRooms());
    } catch {
      setLoadError("The room list could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isActive = true;

    getAdminRooms()
      .then((loadedRooms) => {
        if (isActive) setRooms(loadedRooms);
      })
      .catch(() => {
        if (isActive) setLoadError("The room list could not be loaded.");
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const filteredRooms = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return rooms.filter((room) => {
      const matchesSearch =
        !normalizedSearch ||
        room.roomCode.toLowerCase().includes(normalizedSearch) ||
        room.tenantName?.toLowerCase().includes(normalizedSearch);
      const matchesArea =
        filters.area.length === 0 || filters.area.includes(room.areaID);
      const matchesStatus =
        filters.status.length === 0 || filters.status.includes(room.status);
      const matchesCapacity =
        filters.capacity.length === 0 ||
        filters.capacity.includes(String(room.maxPeople));
      const matchesOwed =
        filters.balance.length === 0 ||
        filters.balance.includes(room.stillOwed > 0 ? "owed" : "not_owed");

      return (
        matchesSearch &&
        matchesArea &&
        matchesStatus &&
        matchesCapacity &&
        matchesOwed
      );
    });
  }, [filters, rooms, search]);

  const areas = useMemo(() => getAreasFromRooms(rooms), [rooms]);

  const selectedRoom =
    rooms.find((room) => room.roomID === selectedRoomID) ?? null;
  const detailRoom =
    rooms.find((room) => room.roomID === detailRoomID) ?? null;
  const editRoom = rooms.find((room) => room.roomID === editRoomID) ?? null;

  function handleRoomCreated(room: AdminRoom) {
    setRooms((current) => [room, ...current]);
    setCreatedRoomCode(room.roomCode);
  }

  function handleAccountPrepared(preparedRoom: AdminRoom) {
    setRooms((current) =>
      current.map((room) =>
        room.roomID === preparedRoom.roomID ? preparedRoom : room,
      ),
    );
    setPreparedUsername(
      preparedRoom.account?.username ?? preparedRoom.roomCode,
    );
  }

  function handleRoomUpdated(updatedRoom: AdminRoom) {
    setRooms((current) =>
      current.map((room) =>
        room.roomID === updatedRoom.roomID ? updatedRoom : room,
      ),
    );
    setUpdatedRoomCode(updatedRoom.roomCode);
  }

  return (
    <PageContainer>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">
            Rooms & leases
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {rooms.length} rooms · one account per room · one active lease at a
            time
          </p>
        </div>
        <Button
          type="button"
          variant="dark"
          onClick={() => setIsAddRoomOpen(true)}
        >
          <PlusIcon />
          Add room
        </Button>
      </div>

      {createdRoomCode ? (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-md border border-[#bfd2bf] bg-status-success-bg px-4 py-3 text-sm text-status-success-fg"
        >
          <span>
            Room <strong>{createdRoomCode}</strong> was created successfully.
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Dismiss success message"
            className="text-status-success-fg hover:bg-black/5"
            onClick={() => setCreatedRoomCode("")}
          >
            <CloseIcon />
          </Button>
        </div>
      ) : null}

      {preparedUsername ? (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-md border border-[#bfd2bf] bg-status-success-bg px-4 py-3 text-sm text-status-success-fg"
        >
          <span>
            Account <strong>{preparedUsername}</strong> was prepared
            successfully.
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Dismiss account success message"
            className="text-status-success-fg hover:bg-black/5"
            onClick={() => setPreparedUsername("")}
          >
            <CloseIcon />
          </Button>
        </div>
      ) : null}

      {updatedRoomCode ? (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-md border border-[#bfd2bf] bg-status-success-bg px-4 py-3 text-sm text-status-success-fg"
        >
          <span>
            Room <strong>{updatedRoomCode}</strong> was updated successfully.
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Dismiss update success message"
            className="text-status-success-fg hover:bg-black/5"
            onClick={() => setUpdatedRoomCode("")}
          >
            <CloseIcon />
          </Button>
        </div>
      ) : null}

      <SearchFilter
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by room code or tenant..."
        searchLabel="Search rooms"
        filters={[
          {
            id: "area",
            label: "Area",
            selected: filters.area,
            options: areas.map((area) => ({
              value: area.areaID,
              label: area.areaName,
            })),
          },
          {
            id: "status",
            label: "Status",
            selected: filters.status,
            options: [
              { value: "available now", label: "Available now" },
              { value: "rented", label: "Rented" },
              { value: "available soon", label: "Available soon" },
              { value: "not available", label: "Not available" },
            ],
          },
          {
            id: "capacity",
            label: "Capacity",
            selected: filters.capacity,
            options: [1, 2, 3, 4].map((capacity) => ({
              value: String(capacity),
              label: `${capacity} ${capacity === 1 ? "person" : "people"}`,
            })),
          },
          {
            id: "balance",
            label: "Balance",
            selected: filters.balance,
            options: [
              { value: "owed", label: "Still owed" },
              { value: "not_owed", label: "No balance" },
            ],
          },
        ]}
        onFilterChange={(id, selected) =>
          setFilters((current) => ({ ...current, [id]: selected }))
        }
        onClearFilters={() =>
          setFilters({ area: [], status: [], capacity: [], balance: [] })
        }
        resultCount={filteredRooms.length}
        totalCount={rooms.length}
        itemNoun="room"
      />

      {isLoading ? (
        <PageLoading
          title="Loading rooms"
          description="Preparing the latest room and lease information..."
        />
      ) : null}
      {loadError ? (
        <ErrorState description={loadError} onRetry={() => void loadRooms()} />
      ) : null}
      {!isLoading && !loadError && filteredRooms.length === 0 ? (
        <EmptyState
          title="No rooms match these filters"
          description="Change or clear a filter to see more rooms."
        />
      ) : null}

      {!isLoading && !loadError && filteredRooms.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-hairline bg-surface">
          <Table className="min-w-[1120px]">
            <TableHeader className="bg-muted">
              <TableRow className="hover:bg-muted">
                <TableHead className="px-4">Room</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Room account</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Electricity</TableHead>
                <TableHead>Still owed</TableHead>
                <TableHead>Monthly rent</TableHead>
                <TableHead className="pr-4 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRooms.map((room) => (
                <TableRow key={room.roomID}>
                  <TableCell className="px-4 font-semibold">
                    {room.roomCode}
                  </TableCell>
                  <TableCell
                    className={
                      room.tenantName ? "text-body" : "text-muted-foreground"
                    }
                  >
                    {room.tenantName ?? "Unassigned"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1.5">
                      <span className="text-xs text-muted-foreground">
                        {room.account?.username ?? "No account"}
                      </span>
                      {room.account ? (
                        <StatusBadge
                          domain="account"
                          status={room.account.status}
                        />
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {room.maxPeople}{" "}
                    {room.maxPeople === 1 ? "person" : "people"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge domain="room" status={room.status} />
                  </TableCell>
                  <TableCell className="text-body">
                    {electricityLabels[room.electricityState]}
                  </TableCell>
                  <TableCell
                    className={
                      room.stillOwed > 0
                        ? "font-medium text-destructive"
                        : "text-muted-foreground"
                    }
                  >
                    {formatCurrency(room.stillOwed)}
                  </TableCell>
                  <TableCell className="font-medium text-body">
                    {formatCurrency(room.price)}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDetailRoomID(room.roomID)}
                      >
                        <EyeIcon />
                        Details
                      </Button>
                      {room.account?.status === "banned" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRoomID(room.roomID)}
                        >
                          <KeyIcon />
                          Prepare
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      <AddRoomDialog
        open={isAddRoomOpen}
        areas={areas}
        onOpenChange={setIsAddRoomOpen}
        onRoomCreated={handleRoomCreated}
      />
      <PrepareRoomAccountDialog
        open={selectedRoom !== null}
        room={selectedRoom}
        onOpenChange={(open) => {
          if (!open) setSelectedRoomID(null);
        }}
        onAccountPrepared={handleAccountPrepared}
      />
      <RoomDetailsSheet
        room={detailRoom}
        onOpenChange={(open) => {
          if (!open) setDetailRoomID(null);
        }}
        onPrepareAccount={(roomID) => {
          setDetailRoomID(null);
          setSelectedRoomID(roomID);
        }}
        onEditRoom={(roomID) => {
          setDetailRoomID(null);
          setEditRoomID(roomID);
        }}
      />
      <EditRoomDialog
        room={editRoom}
        onOpenChange={(open) => {
          if (!open) setEditRoomID(null);
        }}
        onRoomUpdated={handleRoomUpdated}
      />
    </PageContainer>
  );
}

const electricityLabels = {
  checked: "Checked",
  waiting_admin: "Waiting admin",
  late: "Late",
  not_applicable: "Not applicable",
} as const;

export { RoomsPage };
