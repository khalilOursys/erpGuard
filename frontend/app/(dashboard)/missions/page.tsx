"use client";

import { useState, useEffect } from "react"; // Add useEffect import if missing
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import api from "@/lib/api";
import MissionForm from "@/components/MissionForm";

// Define UserRole enum (reused if needed, but not for missions)
enum UserRole {
  ADMIN = "ADMIN",
  COMMERCIAL = "COMMERCIAL",
  MANAGER = "MANAGER",
  ACCOUNTANT = "ACCOUNTANT",
}

// Updated Mission type based on backend response (assuming includes are adjusted as suggested)
type Mission = {
  id: number;
  contractId: number;
  siteId: number | null;
  startDate: string;
  endDate: string;
  requiredPersonnel: number;
  extraPersonnelSlots: number;
  managerId: number;
  companyId: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  contract: {
    id: number;
    contractNumber: string;
    client: { name: string };
  };
  site?: { id: number; name: string };
  requirements: any[]; // Adjust if needed
  assignments: { personnel: any }[]; // Adjust if needed
  manager: { id: number; displayname: string };
};

// Site type for filter
type Site = {
  id: number;
  name: string;
  // Other fields if needed
};

export default function MissionsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("startDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [deletedOnly, setDeletedOnly] = useState(false);
  const [siteId, setSiteId] = useState<number | undefined>(undefined);
  const [startFrom, setStartFrom] = useState("");
  const [startTo, setStartTo] = useState("");
  const [hasManagePermission, setHasManagePermission] = useState(false);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isChecked, setIsChecked] = useState(false); // Renamed for clarity (was checkedPermissions)

  // Permission check: Run ONLY on client-side
  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      router.push("/login");
      return;
    }

    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    const permissions = storedUser.permissions || [];
    if (!permissions.includes("missions.read")) {
      toast.error("Unauthorized");
      router.push("/");
      return;
    }
    setHasManagePermission(permissions.includes("missions.manage"));
    setIsChecked(true);
  }, [router]); // Dependencies: Only re-run if router changes (once on mount)

  // Fetch sites for filter
  const { data: sitesData } = useQuery<Site[]>({
    queryKey: ["sites"],
    queryFn: async () => {
      const response = await api.get("/sites"); // { data: [], total, ... }
      return response.data || [];
    },
    enabled: isChecked,
    retry: false, // Optional: Avoid retry spam during dev
  });

  const availableSites = sitesData || [];

  // Fetch missions with React Query
  const { data: missionsResponse, isLoading: loading } = useQuery<{
    data: Mission[];
    total: number;
    page: number;
    pageSize: number;
  }>({
    queryKey: [
      "missions",
      page,
      pageSize,
      search,
      sortBy,
      sortOrder,
      deletedOnly,
      siteId,
      startFrom,
      startTo,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        search: search || "",
        sortBy,
        sortOrder,
        ...(siteId && { siteId: siteId.toString() }),
        ...(startFrom && { startFrom }),
        ...(startTo && { startTo }),
        ...(deletedOnly && { deletedOnly: "true" }),
      });
      const response = await api.get(`/missions?${params.toString()}`);
      return response; // api.get returns body directly
    },
    enabled: isChecked,
  });

  const missions = missionsResponse?.data || [];
  const total = missionsResponse?.total || 0;

  // Mutations for delete and restore
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/missions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      toast.success("Mission deleted");
    },
    onError: () => toast.error("Failed to delete mission"),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: number) => api.post(`/missions/${id}/restore`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      toast.success("Mission restored");
    },
    onError: () => toast.error("Failed to restore mission"),
  });

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleRestore = (id: number) => {
    restoreMutation.mutate(id);
  };

  // Compute status
  const getStatus = (mission: Mission) => {
    if (mission.isDeleted) return "Deleted";
    const now = new Date();
    const start = new Date(mission.startDate);
    const end = new Date(mission.endDate);
    if (end < now) return "Completed";
    if (start > now) return "Upcoming";
    return "Active";
  };

  const columns: ColumnDef<Mission>[] = [
    {
      accessorKey: "id",
      header: "ID",
    },
    {
      accessorKey: "contract.contractNumber",
      header: "Contract Number",
      cell: ({ row }) => row.original.contract?.contractNumber || "N/A",
    },
    {
      accessorKey: "contract.client.name",
      header: "Client",
      cell: ({ row }) => row.original.contract?.client?.name || "N/A",
    },
    {
      accessorKey: "site.name",
      header: "Site",
      cell: ({ row }) => row.original.site?.name || "N/A",
    },
    {
      accessorKey: "startDate",
      header: "Start Date",
      cell: ({ row }) =>
        row.original.startDate
          ? new Date(row.original.startDate).toLocaleDateString()
          : "N/A",
    },
    {
      accessorKey: "endDate",
      header: "End Date",
      cell: ({ row }) =>
        row.original.endDate
          ? new Date(row.original.endDate).toLocaleDateString()
          : "N/A",
    },
    {
      accessorKey: "requiredPersonnel",
      header: "Required Personnel",
    },
    {
      accessorKey: "assignments.length",
      header: "Assigned Personnel",
      cell: ({ row }) => row.original.assignments?.length || 0,
    },
    {
      accessorKey: "manager.displayname",
      header: "Manager",
      cell: ({ row }) => row.original.manager?.displayname || "N/A",
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = getStatus(row.original);
        const variant =
          status === "Active"
            ? "default"
            : status === "Upcoming"
            ? "secondary"
            : status === "Completed"
            ? "outline"
            : "destructive";
        return <Badge variant={variant}>{status}</Badge>;
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const mission = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {hasManagePermission && (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedMission(mission);
                      setIsAddOpen(true);
                    }}
                  >
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      router.push(`/missions/assignment/${mission.id}`)
                    }
                  >
                    Assignment
                  </DropdownMenuItem>
                  {/* Add Manage Assignments if needed in future */}
                  {mission.isDeleted ? (
                    <DropdownMenuItem onClick={() => handleRestore(mission.id)}>
                      Restore
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => handleDelete(mission.id)}>
                      Delete
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Guard: Don't render until client-side check completes (avoids flash or errors)
  if (!isChecked) {
    return null; // Or return a <div>Loading...</div> or spinner if preferred
  }

  return (
    <div className="space-y-6 p-4 bg-background rounded-lg shadow">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Missions</h1>
        {hasManagePermission && (
          <Dialog
            open={isAddOpen}
            onOpenChange={(open) => {
              setIsAddOpen(open);
              if (!open) setSelectedMission(null);
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={() => setSelectedMission(null)}>
                Add Mission
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <MissionForm
                mission={selectedMission}
                onSuccess={() => {
                  setIsAddOpen(false);
                  setSelectedMission(null);
                  queryClient.invalidateQueries({ queryKey: ["missions"] });
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        <div className="space-y-2">
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search missions..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="site">Site</Label>
          <Select
            value={siteId?.toString() || "all"}
            onValueChange={(v) =>
              setSiteId(v === "all" ? undefined : Number(v))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All Sites" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sites</SelectItem>
              {availableSites.map((site) => (
                <SelectItem key={site.id} value={site.id.toString()}>
                  {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="startFrom">Start From</Label>
          <Input
            id="startFrom"
            type="date"
            value={startFrom}
            onChange={(e) => setStartFrom(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="startTo">Start To</Label>
          <Input
            id="startTo"
            type="date"
            value={startTo}
            onChange={(e) => setStartTo(e.target.value)}
          />
        </div>
        <div className="flex items-end space-x-2">
          <Switch
            id="deletedOnly"
            checked={deletedOnly}
            onCheckedChange={setDeletedOnly}
          />
          <Label htmlFor="deletedOnly">Show Deleted Only</Label>
        </div>
      </div>
      <DataTable
        columns={columns}
        data={missions}
        loading={loading}
        pageCount={Math.ceil(total / pageSize)}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSortChange={(newSortBy, newSortOrder) => {
          setSortBy(newSortBy);
          setSortOrder(newSortOrder);
        }}
      />
    </div>
  );
}
