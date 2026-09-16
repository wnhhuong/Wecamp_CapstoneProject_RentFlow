import { useEffect, useMemo, useState } from "react";

import { EmptyState, ErrorState, PageLoading } from "@/components/feedback";
import { PageContainer } from "@/components/layout";
import { StatusBadge } from "@/components/status";
import type { RoomStatus } from "@/shared/types/status";
import { Button } from "@/components/ui/button";
import {
  CloseIcon,
  KeyIcon,
  PlusIcon,
  SearchIcon,
} from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
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

import { AddRoomDialog } from "./rooms/AddRoomDialog";
import { PrepareRoomAccountDialog } from "./rooms/PrepareRoomAccountDialog";
import { getAreasFromRooms } from "./rooms/utils/getAreasFromRooms";

type StatusFilter = RoomStatus | "all";

function RoomsPage() {
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [selectedRoomID, setSelectedRoomID] = useState<string | null>(null);
  const [createdRoomCode, setCreatedRoomCode] = useState("");
  const [preparedUsername, setPreparedUsername] = useState("");
  const [search, setSearch] = useState("");
  const [areaID, setAreaID] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [capacity, setCapacity] = useState("all");
  const [owed, setOwed] = useState("all");

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
      const matchesArea = areaID === "all" || room.areaID === areaID;
      const matchesStatus = status === "all" || room.status === status;
      const matchesCapacity =
        capacity === "all" || room.maxPeople === Number(capacity);
      const matchesOwed =
        owed === "all" ||
        (owed === "owed" ? room.stillOwed > 0 : room.stillOwed === 0);

      return (
        matchesSearch &&
        matchesArea &&
        matchesStatus &&
        matchesCapacity &&
        matchesOwed
      );
    });
  }, [areaID, capacity, owed, rooms, search, status]);

  const areas = useMemo(() => getAreasFromRooms(rooms), [rooms]);

  const selectedRoom =
    rooms.find((room) => room.roomID === selectedRoomID) ?? null;

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

      <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-hairline bg-surface p-3">
        <div className="relative min-w-[14rem] flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by room code or tenant..."
            aria-label="Search rooms"
            className="bg-white pl-9"
          />
        </div>
        <FilterSelect
          label="Area"
          value={areaID}
          onChange={setAreaID}
          options={[
            ["all", "All areas"],
            ...areas.map(
              (area) => [area.areaID, area.areaName] as [string, string],
            ),
          ]}
        />
        <FilterSelect
          label="Status"
          value={status}
          onChange={(value) => setStatus(value as StatusFilter)}
          options={[
            ["all", "All statuses"],
            ["available now", "Available now"],
            ["rented", "Rented"],
            ["available soon", "Available soon"],
            ["not available", "Not available"],
          ]}
        />
        <FilterSelect
          label="Capacity"
          value={capacity}
          onChange={setCapacity}
          options={[
            ["all", "All capacities"],
            ["1", "1 person"],
            ["2", "2 people"],
            ["3", "3 people"],
            ["4", "4 people"],
          ]}
        />
        <FilterSelect
          label="Balance"
          value={owed}
          onChange={setOwed}
          options={[
            ["all", "All balances"],
            ["owed", "Still owed"],
            ["not_owed", "No balance"],
          ]}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {filteredRooms.length} {filteredRooms.length === 1 ? "room" : "rooms"}{" "}
        matching
      </p>

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
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {!room.account
                          ? "No account"
                          : room.account.status === "inactive"
                            ? "Prepared"
                            : "In use"}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      <p className="text-sm text-muted-foreground">
        Select a room to view its room, lease, tenant and account details.
      </p>

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
    </PageContainer>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <NativeSelect
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
      className="w-full sm:w-auto"
    >
      {options.map(([optionValue, optionLabel]) => (
        <NativeSelectOption key={optionValue} value={optionValue}>
          {optionLabel}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}

const electricityLabels = {
  checked: "Checked",
  waiting_admin: "Waiting admin",
  late: "Late",
  not_applicable: "Not applicable",
} as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export { RoomsPage };
