"use client";

import { useState } from "react";
import { MaterialReactTable, type MRT_ColumnDef } from "material-react-table";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as Toast from "@radix-ui/react-toast";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";

// ------------------ Types ------------------
type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  company?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
};

type PaginatedResponse<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
type PaginationState = { pageIndex: number; pageSize: number };

// ------------------ Fetcher ------------------
const fetchUsers = async ({
  page,
  limit,
}: {
  page: number;
  limit: number;
}): Promise<PaginatedResponse<User>> => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/users?page=${page}&limit=${limit}`
  );
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
};

// ------------------ Component ------------------
export default function UsersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastOpen(true);
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["users", page, limit],
    queryFn: () => fetchUsers({ page, limit }),
    placeholderData: keepPreviousData,
  });

  const handleAddUser = () => {
    router.push("/admin/users/add");
  };

  const handleEdit = (user: User) => {
    // Redirect to edit page with user ID
    router.push(`/admin/users/edit/${user.id}`);
  };

  const handleDelete = async (user: User) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/${selectedUser.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Delete failed");

      // Invalidate and refetch the query to refresh the table
      queryClient.invalidateQueries({ queryKey: ["users"] });

      showToast(`✅ User ${selectedUser.name} deleted`);
    } catch (err) {
      showToast("❌ Failed to delete user");
    } finally {
      setDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const columns: MRT_ColumnDef<User>[] = [
    { accessorKey: "displayname", header: "Name" },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "role", header: "Role" },
    { accessorKey: "company.name", header: "Company" },
    {
      accessorKey: "createdAt",
      header: "Created At",
      Cell: ({ cell }) =>
        new Date(cell.getValue<string>()).toLocaleDateString(),
    },
    {
      id: "actions",
      header: "Actions",
      Cell: ({ row }) => (
        <div className="flex gap-2">
          <button
            className="px-2 py-1 bg-blue-500 text-white rounded-md text-sm"
            onClick={() => handleEdit(row.original)}
          >
            Edit
          </button>
          <button
            className="px-2 py-1 bg-red-500 text-white rounded-md text-sm"
            onClick={() => handleDelete(row.original)}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <Toast.Provider swipeDirection="right">
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Users</h1>
        </div>
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={handleAddUser}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Add New User
          </button>
        </div>

        <MaterialReactTable
          columns={columns}
          data={data?.data ?? []}
          state={{ isLoading }}
          manualPagination
          rowCount={data?.meta.total ?? 0}
          onPaginationChange={(updater) => {
            const newState: PaginationState =
              typeof updater === "function"
                ? updater({ pageIndex: page, pageSize: limit })
                : updater;

            setPage(newState.pageIndex);
            setLimit(newState.pageSize);
          }}
          initialState={{ pagination: { pageIndex: page, pageSize: limit } }}
          muiPaginationProps={{
            rowsPerPageOptions: [5, 10, 20],
          }}
        />

        {/* Error toast */}
        {isError && (
          <Toast.Root
            open
            className="bg-red-600 text-white px-4 py-2 rounded-md shadow-lg"
          >
            <Toast.Title>❌ Failed to fetch users</Toast.Title>
          </Toast.Root>
        )}

        {/* Toast UI */}
        <Toast.Root
          open={toastOpen}
          onOpenChange={setToastOpen}
          className="bg-black text-white px-4 py-2 rounded-md shadow-lg"
        >
          <Toast.Title className="font-bold">{toastMsg}</Toast.Title>
        </Toast.Root>
        <Toast.Viewport className="fixed top-4 right-4 w-96 max-w-full outline-none" />

        {/* Confirm Delete Dialog */}
        <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0  bg-opacity-50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 w-96 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 shadow-lg">
              <Dialog.Title className="text-lg font-bold">
                Confirm Delete
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-gray-600">
                Are you sure you want to delete{" "}
                <span className="font-semibold">
                  {selectedUser?.name ?? ""}
                </span>
                ?
              </Dialog.Description>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setDialogOpen(false)}
                  className="px-4 py-2 rounded-md bg-gray-300 hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </Toast.Provider>
  );
}
