"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

type Service = {
  id: number;
  code?: string;
  name: string;
  description?: string;
  isActive: boolean;
  defaultBasePay?: number;
  defaultExtraPay?: number;
  defaultClientPrice?: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
};

export default function ServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [codeFilter, setCodeFilter] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [deletedOnly, setDeletedOnly] = useState(false);
  const [inactiveOnly, setInactiveOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasManagePermission, setHasManagePermission] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    const permissions = storedUser.permissions || [];
    if (!permissions.includes("services.read")) {
      toast.error("Unauthorized");
      router.push("/");
      return;
    }
    setHasManagePermission(permissions.includes("services.manage"));

    fetchServices();
  }, [page, pageSize, search, codeFilter, sortBy, sortOrder, deletedOnly, inactiveOnly, router]);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        search: search || "",
        sortBy,
        sortOrder,
        ...(deletedOnly ? { deletedOnly: "true" } : {}),
        ...(inactiveOnly ? { inactiveOnly: "true" } : {}),
        ...(codeFilter ? { code: codeFilter } : {}),
      });
      const data = await api.get(`/services?${params.toString()}`);
      setServices(data.data || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      console.error("Error fetching services:", err);
      toast.error(err.message || "Failed to fetch services");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/services/${id}`);
      toast.success("Service deleted");
      fetchServices();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete service");
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await api.post(`/services/${id}/restore`, {});
      toast.success("Service restored");
      fetchServices();
    } catch (err: any) {
      toast.error(err.message || "Failed to restore service");
    }
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
      accessorKey: "isActive",
      header: "Active",
      cell: ({ row }) => (row.original.isActive ? "Yes" : "No"),
    },
    {
      accessorKey: "defaultClientPrice",
      header: "Client Price",
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
                  <DropdownMenuItem onClick={() => { setSelectedService(service); setIsAddOpen(true); }}>
                    Edit
                  </DropdownMenuItem>
                  {service.isDeleted ? (
                    <DropdownMenuItem onClick={() => handleRestore(service.id)}>Restore</DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => handleDelete(service.id)}>Delete</DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 p-4 bg-background rounded-lg shadow">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Services</h1>
        {hasManagePermission && (
          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) setSelectedService(null);
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setSelectedService(null)}>Add Service</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <ServiceForm
                service={selectedService}
                onSuccess={() => {
                  setIsAddOpen(false);
                  setSelectedService(null);
                  fetchServices();
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="search">Search</Label>
          <Input id="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by code, name, or description..." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="codeFilter">Code Filter</Label>
          <Input id="codeFilter" value={codeFilter} onChange={(e) => setCodeFilter(e.target.value)} placeholder="Filter by exact code (e.g., SRV001)" />
        </div>
        <div className="flex items-end space-x-2">
          <Switch id="deletedOnly" checked={deletedOnly} onCheckedChange={setDeletedOnly} />
          <Label htmlFor="deletedOnly">Show Deleted Only</Label>
        </div>
        <div className="flex items-end space-x-2">
          <Switch id="inactiveOnly" checked={inactiveOnly} onCheckedChange={setInactiveOnly} />
          <Label htmlFor="inactiveOnly">Show Inactive Only</Label>
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