// components/contracts-table.tsx
"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Undo,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

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
import { Switch } from "@/components/ui/switch";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

// types/index.ts
export type Personnel = {
  id: number;
  companyId: number;
  firstName: string;
  lastName: string;
  identifier?: string;
  email: string;
  phone?: string;
  hireDate?: string;
  baseSalary: number;
  serviceId?: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  service?: {
    name: string;
  };
};

export type Contract = {
  id: number;
  personnelId: number;
  contractNumber: string;
  startDate: string;
  endDate: string;
  salary: number;
  position: string;
  status: "active" | "expired" | "terminated";
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  personnel?: {
    firstName: string;
    lastName: string;
  };
};

export type QueryContractsDto = {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: "contractNumber" | "startDate" | "endDate";
  sortOrder?: "asc" | "desc";
  deletedOnly?: boolean;
  startDate?: string;
  endDate?: string;
};

interface PageProps {
  params: { id: string };
}

type ContractsResponse = {
  data: Contract[];
  total: number;
};

export default function ContractsTable({ params }: PageProps) {
  // Correctly access the id from params
  const { id } = params;
  const router = useRouter();
  const queryClient = useQueryClient();

  // State for client-side only values
  const [isClient, setIsClient] = useState(false);
  const [hasManagePermission, setHasManagePermission] = useState(false);

  // State for table controls
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] =
    useState<QueryContractsDto["sortBy"]>("contractNumber");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [deletedOnly, setDeletedOnly] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Set client-side values after mount
  useEffect(() => {
    setIsClient(true);
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    const permissions = storedUser.permissions || [];
    setHasManagePermission(permissions.includes("personnel.manage"));
  }, []);

  // Fetch personnel data
  const {
    data: personnel,
    isLoading: personnelLoading,
    error: personnelError,
  } = useQuery<Personnel>({
    queryKey: ["personnel", id],
    queryFn: async () => {
      const response = await api.get(`/personnels/${id}`);

      // Check if response contains data property (common pattern)
      if (response.data) {
        return response.data;
      }

      // If response is already the data, return it directly
      if (response.id || response.name) {
        // Adjust based on your Personnel interface
        return response;
      }

      throw new Error("Failed to fetch personnel - invalid response structure");
    },
  });

  // Fetch contracts data
  const {
    data: contractsData,
    isLoading: contractsLoading,
    error: contractsError,
  } = useQuery<ContractsResponse>({
    queryKey: [
      "contracts",
      id,
      page,
      pageSize,
      search,
      sortBy,
      sortOrder,
      deletedOnly,
      startDate,
      endDate,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(search && { search }),
        sortBy: sortBy || "contractNumber",
        sortOrder,
        ...(deletedOnly && { deletedOnly: "true" }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });

      const response = await api.get(
        `/personnels/${id}/contracts?${params.toString()}`
      );

      return {
        data: response.data || [],
        total: response.total || 0,
      };
    },
  });

  // Delete contract mutation
  const deleteMutation = useMutation({
    mutationFn: (contractId: number) =>
      api.delete(`/personnels/contracts/${contractId}`),
    onSuccess: () => {
      toast.success("Contract deleted");
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
    onError: () => {
      toast.error("Failed to delete contract");
    },
  });

  // Restore contract mutation
  const restoreMutation = useMutation({
    mutationFn: (contractId: number) =>
      api.post(`/personnels/contracts/${contractId}/restore`, {}),
    onSuccess: () => {
      toast.success("Contract restored");
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
    onError: () => {
      toast.error("Failed to restore contract");
    },
  });

  const handleDelete = (contractId: number) => {
    deleteMutation.mutate(contractId);
  };

  const handleRestore = (contractId: number) => {
    restoreMutation.mutate(contractId);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      active: "bg-green-100 text-green-800",
      expired: "bg-red-100 text-red-800",
      terminated: "bg-gray-100 text-gray-800",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs ${
          statusColors[status as keyof typeof statusColors] || "bg-gray-100"
        }`}
      >
        {status}
      </span>
    );
  };

  const handleAddContract = () => {
    if (id) {
      router.push(`/personnel/contract/add/${id}`);
    }
  };

  const handleEditContract = (idContract: number) => {
    router.push(`/personnel/contract/edit/${idContract}`);
  };

  const columns: ColumnDef<Contract>[] = [
    {
      accessorKey: "contractNumber",
      header: "Contract #",
    },
    {
      accessorKey: "startDate",
      header: "Start Date",
      cell: ({ row }) => formatDate(row.original.startDate),
    },
    {
      accessorKey: "endDate",
      header: "End Date",
      cell: ({ row }) => formatDate(row.original.endDate),
    },
    {
      accessorKey: "salary",
      header: "Salary",
      cell: ({ row }) => formatCurrency(row.original.salary),
    },
    {
      accessorKey: "position",
      header: "Position",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const contract = row.original;
        const isMutating =
          deleteMutation.isPending || restoreMutation.isPending;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0"
                disabled={isMutating}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  /* View contract details */
                }}
                disabled={isMutating}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              {hasManagePermission && (
                <>
                  <DropdownMenuItem
                    onClick={() => handleEditContract(contract.id)}
                    disabled={isMutating}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  {contract.isDeleted ? (
                    <DropdownMenuItem
                      onClick={() => handleRestore(contract.id)}
                      disabled={isMutating}
                    >
                      <Undo className="mr-2 h-4 w-4" />
                      Restore
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => handleDelete(contract.id)}
                      disabled={isMutating}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
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

  // Handle errors
  useEffect(() => {
    console.log("useEffect", personnelError);

    if (personnelError) {
      toast.error("Failed to fetch personnel details");
    }
    if (contractsError) {
      toast.error("Failed to fetch contracts");
    }
  }, [personnelError, contractsError]);

  // Show loading state while checking client-side
  if (!isClient) {
    return (
      <div className="space-y-6 p-4 bg-background rounded-lg shadow">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 bg-background rounded-lg shadow">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">
            Contracts for {personnel?.firstName} {personnel?.lastName}
            {(personnelLoading || contractsLoading) && " (Loading...)"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage contracts for this personnel
          </p>
        </div>
        {hasManagePermission && (
          <Button onClick={handleAddContract}>Add contract</Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contract-search">Search</Label>
          <Input
            id="contract-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contracts..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="start-date">Start Date</Label>
          <Input
            type="date"
            id="start-date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end-date">End Date</Label>
          <Input
            type="date"
            id="end-date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div className="flex items-end space-x-2">
          <Switch
            id="contracts-deletedOnly"
            checked={deletedOnly}
            onCheckedChange={setDeletedOnly}
          />
          <Label htmlFor="contracts-deletedOnly">Show Deleted Only</Label>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={contractsData?.data || []}
        loading={contractsLoading}
        pageCount={Math.ceil((contractsData?.total || 0) / pageSize)}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSortChange={(newSortBy, newSortOrder) => {
          setSortBy(newSortBy as QueryContractsDto["sortBy"]);
          setSortOrder(newSortOrder);
        }}
      />
    </div>
  );
}
