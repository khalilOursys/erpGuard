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
import UserForm from "@/components/UserForm";
import PermissionsManager from "@/components/PermissionsManager";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import api from "@/lib/api";

// Define UserRole enum
enum UserRole {
  ADMIN = "ADMIN",
  COMMERCIAL = "COMMERCIAL",
  MANAGER = "MANAGER",
  ACCOUNTANT = "ACCOUNTANT",
}

// Updated User type
type User = {
  id: number;
  identifier: string;
  displayname?: string;
  email?: string;
  role: UserRole;
  companyId: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  permissions: string[];
};

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("displayname");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [deletedOnly, setDeletedOnly] = useState(false); // Default to showing all (non-deleted)
  const [role, setRole] = useState<UserRole | undefined>(undefined);
  const [permission, setPermission] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [hasManagePermission, setHasManagePermission] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    console.log("UsersPage - Stored User:", storedUser); // Debug stored user
    const permissions = storedUser.permissions || [];
    if (!permissions.includes("users.read")) {
      toast.error("Unauthorized");
      router.push("/");
      return;
    }
    setHasManagePermission(permissions.includes("users.manage"));

    fetchUsers();
    fetchAvailablePermissions();
  }, [page, pageSize, search, sortBy, sortOrder, deletedOnly, role, permission, router]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        search: search || "",
        sortBy,
        sortOrder,
        ...(role && { role: role }),
        ...(permission && { permission }),
        ...(deletedOnly && { deletedOnly: "true" }), // Only add deletedOnly if true
      });
      const data = await api.get(`/users?${params.toString()}`);
      console.log("Fetching users from:", `/users?${params.toString()}`); // Debug URL
      console.log("Fetched users data:", data); // Debug API response
      if (!data.data || !Array.isArray(data.data)) {
        console.warn("Unexpected data format:", data);
        setUsers([]);
      } else {
        setUsers(data.data);
      }
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Error fetching users:", err); // Log error details
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailablePermissions = async () => {
    try {
      const data = await api.get("/users/permissions/all");
      setAvailablePermissions(data);
    } catch (err) {
      console.error("Error fetching permissions:", err);
      toast.error("Failed to fetch permissions");
      setAvailablePermissions([]); // Fallback to empty list
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/users/${id}`);
      toast.success("User deleted");
      fetchUsers();
    } catch (err) {
      toast.error("Failed to delete user");
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await api.post(`/users/${id}/restore`, {});
      toast.success("User restored");
      fetchUsers();
    } catch (err) {
      toast.error("Failed to restore user");
    }
  };

  const handleUpdate = async (userId: number, updatedData: Partial<User>) => {
    try {
      await api.put(`/users/${userId}`, updatedData); // Using PUT as per UserForm
      toast.success("User updated");
      fetchUsers();
    } catch (err) {
      toast.error("Failed to update user");
    }
  };

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "identifier",
      header: "Identifier",
    },
    {
      accessorKey: "displayname",
      header: "Display Name",
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "role",
      header: "Role",
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const user = row.original;
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
                  <DropdownMenuItem onClick={() => { setSelectedUser(user); setIsAddOpen(true); }}>
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSelectedUser(user); setIsPermissionsOpen(true); }}>
                    Manage Permissions
                  </DropdownMenuItem>
                  {user.isDeleted ? (
                    <DropdownMenuItem onClick={() => handleRestore(user.id)}>Restore</DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => handleDelete(user.id)}>Delete</DropdownMenuItem>
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
        <h1 className="text-2xl font-bold">Users</h1>
        {hasManagePermission && (
          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) setSelectedUser(null);
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setSelectedUser(null)}>Add User</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <UserForm
                user={selectedUser}
                onSuccess={() => {
                  setIsAddOpen(false);
                  setSelectedUser(null);
                  fetchUsers();
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="search">Search</Label>
          <Input id="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select value={role || "all"} onValueChange={(v) => setRole(v === "all" ? undefined : v as UserRole)}>
            <SelectTrigger>
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="COMMERCIAL">Commercial</SelectItem>
              <SelectItem value="MANAGER">Manager</SelectItem>
              <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="permission">Permission</Label>
          <Select value={permission || "all"} onValueChange={(v) => setPermission(v === "all" ? undefined : v)}>
            <SelectTrigger>
              <SelectValue placeholder="All Permissions" />
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-y-auto custom-scrollbar"> {/* Updated with custom-scrollbar */}
              <SelectItem value="all">All Permissions</SelectItem>
              {availablePermissions.map((perm) => (
                <SelectItem key={perm} value={perm}>{perm}</SelectItem>
              ))}
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
        data={users}
        loading={loading}
        pageCount={Math.ceil(total / pageSize)}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSortChange={(newSortBy, newSortOrder) => {
          setSortBy(newSortBy);
          setSortOrder(newSortOrder);
        }}
      />
      {selectedUser && (
        <Dialog open={isPermissionsOpen} onOpenChange={(open) => {
          setIsPermissionsOpen(open);
          if (!open) setSelectedUser(null);
        }}>
          <DialogContent className="max-w-lg">
            <PermissionsManager
              userId={selectedUser.id}
              onSuccess={() => {
                setIsPermissionsOpen(false);
                fetchUsers();
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}