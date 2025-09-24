"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  UserPlus,
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

// Define Personnel type matching your backend
type Personnel = {
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

type PersonnelResponse = {
  data: Personnel[];
  total: number;
};

export default function PersonnelPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // State for table controls
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("lastName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [deletedOnly, setDeletedOnly] = useState(false);

  // State for client-side only values
  const [isClient, setIsClient] = useState(false);
  const [storedUser, setStoredUser] = useState<any>({});
  const [hasManagePermission, setHasManagePermission] = useState(false);
  const [companyId, setCompanyId] = useState(0);

  // Set client-side values after mount
  useEffect(() => {
    setIsClient(true);
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    if (!token) {
      router.push("/login");
      return;
    }

    if (user) {
      const userData = JSON.parse(user);
      setStoredUser(userData);
      const permissions = userData.permissions || [];
      setCompanyId(userData.companyId || 0);
      setHasManagePermission(permissions.includes("personnel.manage"));

      if (!permissions.includes("personnel.read")) {
        toast.error("Unauthorized");
      }
    }
  }, [router]);

  // Fetch personnel data with React Query
  const {
    data: personnelData,
    isLoading,
    error,
  } = useQuery<PersonnelResponse>({
    queryKey: [
      "personnel",
      companyId,
      page,
      pageSize,
      search,
      sortBy,
      sortOrder,
      deletedOnly,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        search: search || "",
        sortBy,
        sortOrder,
        ...(deletedOnly && { deletedOnly: "true" }),
      });

      const response = await api.get(
        `/personnels?companyId=${companyId}&${params.toString()}`
      );

      return {
        data: response.data || [],
        total: response.total || 0,
      };
    },
  });

  // Delete personnel mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/personnels/${id}`),
    onSuccess: () => {
      toast.success("Personnel deleted");
      queryClient.invalidateQueries({ queryKey: ["personnel"] });
    },
    onError: () => {
      toast.error("Failed to delete personnel");
    },
  });

  // Restore personnel mutation
  const restoreMutation = useMutation({
    mutationFn: (id: number) => api.post(`/personnels/${id}/restore`, {}),
    onSuccess: () => {
      toast.success("Personnel restored");
      queryClient.invalidateQueries({ queryKey: ["personnel"] });
    },
    onError: () => {
      toast.error("Failed to restore personnel");
    },
  });

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleRestore = (id: number) => {
    restoreMutation.mutate(id);
  };

  const handleAddPersonnel = () => {
    router.push("/personnel/add");
  };

  const handleEditPersonnel = (id: number) => {
    router.push(`/personnel/edit/${id}`);
  };

  const handleContract = (id: number) => {
    router.push(`/personnel/contract/${id}`);
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

  const columns: ColumnDef<Personnel>[] = [
    {
      accessorKey: "identifier",
      header: "ID",
    },
    {
      accessorKey: "firstName",
      header: "First Name",
    },
    {
      accessorKey: "lastName",
      header: "Last Name",
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => row.original.phone || "N/A",
    },
    {
      accessorKey: "baseSalary",
      header: "Salary",
      cell: ({ row }) => formatCurrency(row.original.baseSalary),
    },
    {
      accessorKey: "hireDate",
      header: "Hire Date",
      cell: ({ row }) => formatDate(row.original.hireDate),
    },
    {
      accessorKey: "service.name",
      header: "Service",
      cell: ({ row }) => row.original.service?.name || "N/A",
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const personnel = row.original;
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
              {hasManagePermission && (
                <>
                  <DropdownMenuItem
                    onClick={() => handleEditPersonnel(personnel.id)}
                    disabled={isMutating}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleContract(personnel.id)}
                    disabled={isMutating}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Contract
                  </DropdownMenuItem>
                  {personnel.isDeleted ? (
                    <DropdownMenuItem
                      onClick={() => handleRestore(personnel.id)}
                      disabled={isMutating}
                    >
                      <Undo className="mr-2 h-4 w-4" />
                      Restore
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => handleDelete(personnel.id)}
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
  if (error) {
    toast.error("Failed to fetch personnel");
  }

  // Show loading state while checking authentication
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Personnel Management</h1>
        {hasManagePermission && (
          <Button onClick={handleAddPersonnel}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Personnel
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search personnel..."
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
        data={personnelData?.data || []}
        loading={isLoading}
        pageCount={Math.ceil((personnelData?.total || 0) / pageSize)}
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
