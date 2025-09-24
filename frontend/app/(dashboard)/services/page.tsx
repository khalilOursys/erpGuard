"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
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
import ServiceForm from "@/components/ServiceForm";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import api from "@/lib/api";

// Define Service type matching your backend
type Service = {
  id: number;
  companyId: number;
  code: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
};

type ServicesResponse = {
  data: Service[];
  total: number;
};

export default function ServicesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [deletedOnly, setDeletedOnly] = useState(false);
  const [hasManagePermission, setHasManagePermission] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Get user data from localStorage
  const getStoredUser = () => {
    if (typeof window === "undefined") return {};
    return JSON.parse(localStorage.getItem("user") || "{}");
  };

  // Fetch services with React Query
  const {
    data: servicesData,
    isLoading: loading,
    error,
    refetch,
  } = useQuery<ServicesResponse>({
    queryKey: [
      "services",
      page,
      pageSize,
      search,
      sortBy,
      sortOrder,
      deletedOnly,
    ],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        throw new Error("No token found");
      }

      const storedUser = getStoredUser();
      const permissions = storedUser.permissions || [];
      if (!permissions.includes("services.read")) {
        toast.error("Unauthorized");
        throw new Error("Unauthorized");
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        search: search || "",
        sortBy,
        sortOrder,
        ...(deletedOnly && { deletedOnly: "true" }),
      });

      const companyId = storedUser.companyId || 0;
      const response = await api.get(
        `/services?companyId=${companyId}&${params.toString()}`
      );

      return response;
    },
  });

  // Mutations for delete, restore, and update
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/services/${id}`),
    onSuccess: () => {
      toast.success("Service deleted");
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
    onError: () => {
      toast.error("Failed to delete service");
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: number) => api.post(`/services/${id}/restore`, {}),
    onSuccess: () => {
      toast.success("Service restored");
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
    onError: () => {
      toast.error("Failed to restore service");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Service> }) =>
      api.put(`/services/${id}`, data),
    onSuccess: () => {
      toast.success("Service updated successfully");
      queryClient.invalidateQueries({ queryKey: ["services"] });
      setIsAddOpen(false);
      setSelectedService(null);
    },
    onError: () => {
      toast.error("Failed to update service");
    },
  });

  // Check authentication and permissions on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const storedUser = getStoredUser();
    const permissions = storedUser.permissions || [];

    if (!permissions.includes("services.read")) {
      toast.error("Unauthorized");
      return;
    }

    setHasManagePermission(permissions.includes("services.manage"));

    // Only fetch data if we have the required permission
    if (permissions.includes("services.read")) {
      refetch();
    }
  }, [router, refetch]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1); // Reset to first page when searching
      refetch();
    }, 300);

    return () => clearTimeout(timer);
  }, [search, refetch]);

  // Refetch when filters change
  useEffect(() => {
    refetch();
  }, [page, pageSize, sortBy, sortOrder, deletedOnly, refetch]);

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleRestore = (id: number) => {
    restoreMutation.mutate(id);
  };

  const handleUpdate = (serviceId: number, updatedData: Partial<Service>) => {
    updateMutation.mutate({ id: serviceId, data: updatedData });
  };

  const columns: ColumnDef<Service>[] = [
    {
      accessorKey: "code",
      header: "Code",
    },
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "description",
      header: "Description",
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const service = row.original;
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
                      setSelectedService(service);
                      setIsAddOpen(true);
                    }}
                  >
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push(`/audit-logs/${service.id}`)}
                  >
                    View Audit Logs
                  </DropdownMenuItem>
                  {service.isDeleted ? (
                    <DropdownMenuItem onClick={() => handleRestore(service.id)}>
                      Restore
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => handleDelete(service.id)}>
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

  const services = servicesData?.data || [];
  const total = servicesData?.total || 0;

  return (
    <div className="space-y-6 p-4 bg-background rounded-lg shadow">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Services</h1>
        {hasManagePermission && (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>Add Service</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <ServiceForm
                service={selectedService}
                onSuccess={() => {
                  setIsAddOpen(false);
                  setSelectedService(null);
                  refetch();
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services..."
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
        data={services}
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
