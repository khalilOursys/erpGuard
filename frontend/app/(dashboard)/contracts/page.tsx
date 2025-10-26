// pages/contracts.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Download, AlertCircle } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";

enum ContractStatus {
  DRAFT = "DRAFT",
  SUBMITTED_FOR_REVIEW = "SUBMITTED_FOR_REVIEW",
  CONFIRMED = "CONFIRMED",
  REJECTED = "REJECTED",
}

type Contract = {
  id: number;
  contractNumber: string;
  client: { id: number; name: string };
  startDate: string;
  endDate: string;
  file?: { id: number; url: string; filename: string };
  status: ContractStatus;
  sites: {
    siteId: number;
    site: { id: number; name: string } | null;
    startDate: string;
    endDate: string;
    services: { serviceId: number; requiredCount: number }[];
  }[];
  submittedBy?: { id: number; displayname: string };
  confirmedBy?: { id: number; displayname: string };
  companyId: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
};

export default function ContractsPage() {
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ContractStatus | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    const userPermissions = storedUser.permissions || [];
    setPermissions(userPermissions);

    if (!userPermissions.includes("contracts.read")) {
      toast.error("Unauthorized");
      router.push("/");
      return;
    }

    fetchContracts();
  }, [page, pageSize, search, status, router]);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        search: search || "",
        ...(status && { status }),
      });
      const data = await api.get(`/contracts?${params.toString()}`);
      setContracts(data.data || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error("Failed to fetch contracts");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForReview = async (id: number) => {
    try {
      await api.patch(`/contracts/${id}/submit`);
      toast.success("Contract submitted for review");
      fetchContracts();
    } catch (err) {
      toast.error("Failed to submit contract");
    }
  };

  const handleConfirm = async (id: number) => {
    try {
      await api.patch(`/contracts/${id}/confirm`);
      toast.success("Contract confirmed");
      fetchContracts();
    } catch (err) {
      toast.error("Failed to confirm contract");
    }
  };

  const handleReject = async (id: number) => {
    try {
      const reason = prompt("Enter rejection reason (optional):");
      await api.patch(`/contracts/${id}/reject`, { reason });
      toast.success("Contract rejected");
      fetchContracts();
    } catch (err) {
      toast.error("Failed to reject contract");
    }
  };

  const handleDownloadPDF = async (url: string, filename: string) => {
    try {
      // Ensure the URL is absolute by prepending the API base URL if needed
      const absoluteUrl = url.startsWith('http')
        ? url
        : `${process.env.NEXT_PUBLIC_API_URL}${url}`;
      const response = await fetch(absoluteUrl, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename; // Use the original filename from the backend
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("PDF download failed:", err);
      toast.error("Failed to download PDF: " + err);
    }
  };

  const columns: ColumnDef<Contract>[] = [
    {
      id: "download",
      header: "Download Contract",
      cell: ({ row }) => {
        const contract = row.original;
        const file = contract.file;
        if (file?.url) {
          return (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDownloadPDF(file.url, file.filename)}
              title="Download PDF"
            >
              <Download className="h-4 w-4" />
            </Button>
          );
        } else {
          return (
            <div className="flex justify-center items-center h-8 w-8">
              <AlertCircle
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
          );
        }
      },
    },
    {
      accessorKey: "contractNumber",
      header: "Contract Number",
    },
    {
      accessorKey: "client.name",
      header: "Client",
    },
    {
      accessorKey: "status",
      header: "Status",
    },
    {
      accessorKey: "startDate",
      header: "Start Date",
      cell: ({ row }) => new Date(row.original.startDate).toLocaleDateString(),
    },
    {
      accessorKey: "endDate",
      header: "End Date",
      cell: ({ row }) => new Date(row.original.endDate).toLocaleDateString(),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const contract = row.original;

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
              <DropdownMenuItem
                onClick={() => router.push(`/contracts/edit/${contract.id}`)}
              >
                View/Edit
              </DropdownMenuItem>

              {permissions.includes("contracts.manage") &&
                contract.status === "DRAFT" && (
                  <DropdownMenuItem
                    onClick={() => handleSubmitForReview(contract.id)}
                  >
                    Submit for Review
                  </DropdownMenuItem>
                )}
              {permissions.includes("contracts.confirm") &&
                contract.status === "SUBMITTED_FOR_REVIEW" && (
                  <>
                    <DropdownMenuItem
                      onClick={() => handleConfirm(contract.id)}
                    >
                      Confirm
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleReject(contract.id)}
                    >
                      Reject
                    </DropdownMenuItem>
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
        <h1 className="text-2xl font-bold">Contracts</h1>
        {permissions.includes("contracts.create") && (
          <Button onClick={() => router.push("/contracts/add")}>
            Add Contract
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contracts..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={status || "all"}
            onValueChange={(v) =>
              setStatus(v === "all" ? undefined : (v as ContractStatus))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.values(ContractStatus).map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DataTable
        columns={columns}
        data={contracts}
        loading={loading}
        pageCount={Math.ceil(total / pageSize)}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSortChange={() => {}}
      />
    </div>
  );
}