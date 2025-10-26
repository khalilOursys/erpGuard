// app/personnel/page.tsx
// Updated to pass personnel details to PersonnelContractsManager

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Download, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api"; // Add this import

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
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import PersonnelForm from "@/components/PersonnelForm";
import PersonnelContractsManager from "@/components/PersonnelContractsManager";
import api from "@/lib/api";

type Personnel = {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  identifier?: string;
  identifierType?: string;
  baseSalary: number;
  idPicture?: { id: number; url: string };
  isDeleted: boolean;
};

export default function PersonnelPage() {
  const router = useRouter();
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("lastName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [deletedOnly, setDeletedOnly] = useState(false);
  const [identifierType, setIdentifierType] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [hasManagePermission, setHasManagePermission] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [selectedPersonnelForContracts, setSelectedPersonnelForContracts] = useState<Personnel | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    const permissions = storedUser.permissions || [];
    if (!permissions.includes("personnel.read")) {
      toast.error("Unauthorized");
      router.push("/");
      return;
    }
    setHasManagePermission(permissions.includes("personnel.manage"));

    fetchPersonnel();
  }, [page, pageSize, search, sortBy, sortOrder, deletedOnly, identifierType, router]);

  const fetchPersonnel = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        search: search || "",
        sortBy,
        sortOrder,
        ...(identifierType && { identifierType }),
        ...(deletedOnly && { deletedOnly: "true" }),
      });
      const data = await api.get(`/personnel?${params.toString()}`);
      setPersonnelList(data.data || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error("Failed to fetch personnel");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/personnel/${id}`);
      toast.success("Personnel deleted");
      fetchPersonnel();
    } catch (err) {
      toast.error("Failed to delete personnel");
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await api.post(`/personnel/${id}/restore`, {});
      toast.success("Personnel restored");
      fetchPersonnel();
    } catch (err) {
      toast.error("Failed to restore personnel");
    }
  };

  const handleDownloadID = async (url: string, filename: string) => {
    try {
      // Extract the actual filename from the URL to preserve extension
      const actualFilename = url.split('/').pop() || filename;
      const link = document.createElement("a");
      link.href = `${API_BASE}${url}`;
      link.download = actualFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      toast.error("Failed to download ID picture");
    }
  };

  const columns: ColumnDef<Personnel>[] = [
    {
      id: "download",
      header: "Download ID",
      cell: ({ row }) => {
        const personnel = row.original;
        const fileUrl = personnel.idPicture?.url;
        if (fileUrl) {
          return (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDownloadID(fileUrl, `id-${personnel.id}`)}
              title="Download ID Picture"
            >
              <Download className="h-4 w-4" />
            </Button>
          );
        } else {
          return (
            <span title="No ID uploaded" className="inline-block">
              <AlertCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </span>
          );
        }
      },
    },
    {
      accessorKey: "identifier",
      header: "Identifier",
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
    },
    {
      accessorKey: "identifierType",
      header: "ID Type",
    },
    {
      accessorKey: "baseSalary",
      header: "Base Salary",
      cell: ({ row }) => row.original.baseSalary,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const personnel = row.original;
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
                  <DropdownMenuItem onClick={() => { setSelectedPersonnel(personnel); setIsAddOpen(true); }}>
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSelectedPersonnelForContracts(personnel); setContractDialogOpen(true); }}>
                    Manage Contracts
                  </DropdownMenuItem>
                  {personnel.isDeleted ? (
                    <DropdownMenuItem onClick={() => handleRestore(personnel.id)}>Restore</DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => handleDelete(personnel.id)}>Delete</DropdownMenuItem>
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
        <h1 className="text-2xl font-bold">Personnel</h1>
        {hasManagePermission && (
          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) setSelectedPersonnel(null);
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setSelectedPersonnel(null)}>Add Personnel</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <PersonnelForm
                personnel={selectedPersonnel}
                onSuccess={() => {
                  setIsAddOpen(false);
                  setSelectedPersonnel(null);
                  fetchPersonnel();
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="search">Search</Label>
          <Input id="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search personnel..." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="identifierType">Identifier Type</Label>
          <Select value={identifierType || "all"} onValueChange={(v) => setIdentifierType(v === "all" ? undefined : v)}>
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="NATIONAL_ID">National ID</SelectItem>
              <SelectItem value="PASSPORT">Passport</SelectItem>
              <SelectItem value="RESIDENCE_PERMIT">Residence Permit</SelectItem>
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
        data={personnelList}
        loading={loading}
        pageCount={Math.ceil(total / pageSize)}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSortChange={(newSortBy, newSortOrder) => {
          setSortBy(newSortBy);
          setSortOrder(newSortOrder);
        }}
      />
      {selectedPersonnelForContracts && (
        <PersonnelContractsManager
          personnelId={selectedPersonnelForContracts.id}
          firstName={selectedPersonnelForContracts.firstName}
          lastName={selectedPersonnelForContracts.lastName}
          identifier={selectedPersonnelForContracts.identifier}
          open={contractDialogOpen}
          onOpenChange={(open) => {
            setContractDialogOpen(open);
            if (!open) setSelectedPersonnelForContracts(null);
          }}
        />
      )}
    </div>
  );
}