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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import api from "@/lib/api";

// Define ClientType enum from Prisma schema
enum ClientType {
  FACTORY = "FACTORY",
  BANK = "BANK",
  INDIVIDUAL = "INDIVIDUAL",
  OTHER = "OTHER",
}

type Client = {
  id: number;
  name: string;
  type: ClientType;
  address?: string;
  tax_number?: string;
  rib?: string;
  companyId: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  contacts?: any[];
  sites?: any[];
};

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [deletedOnly, setDeletedOnly] = useState(false);
  const [type, setType] = useState<ClientType | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [hasManagePermission, setHasManagePermission] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    const permissions = storedUser.permissions || [];
    if (!permissions.includes("client.read")) {
      toast.error("Unauthorized");
      router.push("/");
      return;
    }
    setHasManagePermission(permissions.includes("client.manage"));

    fetchClients();
  }, [page, pageSize, search, sortBy, sortOrder, deletedOnly, type, router]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        search: search || "",
        sortBy,
        sortOrder,
        ...(type && { type: type }),
        ...(deletedOnly && { deletedOnly: "true" }),
      });
      const data = await api.get(`/clients?${params.toString()}`);
      if (!data.data || !Array.isArray(data.data)) {
        console.warn("Unexpected data format:", data);
        setClients([]);
      } else {
        setClients(data.data);
      }
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Error fetching clients:", err);
      toast.error("Failed to fetch clients");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/clients/${id}`);
      toast.success("Client deleted");
      fetchClients();
    } catch (err) {
      toast.error("Failed to delete client");
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await api.post(`/clients/${id}/restore`, {});
      toast.success("Client restored");
      fetchClients();
    } catch (err) {
      toast.error("Failed to restore client");
    }
  };

  const columns: ColumnDef<Client>[] = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "type",
      header: "Type",
    },
    {
      accessorKey: "address",
      header: "Address",
      cell: ({ row }) => row.original.address || "N/A",
    },
    {
      accessorKey: "tax_number",
      header: "Tax Number",
      cell: ({ row }) => row.original.tax_number || "N/A",
    },
    {
      accessorKey: "rib",
      header: "RIB",
      cell: ({ row }) => row.original.rib || "N/A",
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const client = row.original;
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
                  <DropdownMenuItem onClick={() => router.push(`/clients/edit/${client.id}`)}>
                    Edit
                  </DropdownMenuItem>
                  {client.isDeleted ? (
                    <DropdownMenuItem onClick={() => handleRestore(client.id)}>Restore</DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => handleDelete(client.id)}>Delete</DropdownMenuItem>
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
        <h1 className="text-2xl font-bold">Clients</h1>
        {hasManagePermission && (
          <Button onClick={() => router.push("/clients/add")}>Add Client</Button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="search">Search</Label>
          <Input id="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clients..." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select value={type || "all"} onValueChange={(v) => setType(v === "all" ? undefined : v as ClientType)}>
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="FACTORY">Factory</SelectItem>
              <SelectItem value="BANK">Bank</SelectItem>
              <SelectItem value="INDIVIDUAL">Individual</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end space-x-2">
          <Switch id="deletedOnly" checked={deletedOnly} onCheckedChange={setDeletedOnly} />
          <Label htmlFor="deletedOnly">Show Deleted Only</Label>
        </div>
      </div>
      <DataTable
        columns={columns}
        data={clients}
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