"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table";

type AuditLog = {
  id: number;
  action: string;
  entity: string;
  entityId: number;
  timestamp: string;
  previousData: any;
  newData: any;
  userId: number;
  user: {
    id: number;
    displayname: string;
    identifier: string;
    email?: string | null;
  };
  parentId: number | null;
  state: string;
  firstName: string;
  lastName: string;
  email: string;
  managerId: number | null;
};

const AuditLogsHierarchyPage = () => {
  const params = useParams();
  const hierarchyId = parseInt(params.hierarchyId as string);

  // Transform API data to match table structure
  const transformAuditLogToTableData = (auditLogs: any[]): AuditLog[] => {
    return auditLogs.map((log) => {
      const displayname = log.user?.displayname || ["Unknown", "User"];

      return {
        ...log,
        displayname,
        email: log.user?.email || log.user?.identifier || "",
        managerId: log.parentId,
      };
    });
  };

  // Fetch audit logs using React Query
  const {
    data: auditLogs,
    isLoading,
    error,
    isError,
  } = useQuery({
    queryKey: ["audit-logs", "hierarchy", hierarchyId],
    queryFn: async (): Promise<AuditLog[]> => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/audit-logs/hierarchy/${hierarchyId}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch audit logs: ${response.status}`);
      }

      const apiData = await response.json();
      return transformAuditLogToTableData(apiData);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!hierarchyId, // Only fetch if hierarchyId is valid
  });

  // Define table columns
  const columns = useMemo<MRT_ColumnDef<AuditLog>[]>(
    () => [
      {
        accessorKey: "action",
        header: "Action",
        size: 120,
      },
      {
        accessorKey: "indentifier",
        header: "indentifier",
        size: 120,
      },
      {
        accessorKey: "timestamp",
        header: "Timestamp",
        size: 180,
        Cell: ({ cell }: { cell: any }) => {
          const timestamp = cell.getValue();
          return timestamp ? new Date(timestamp).toLocaleString() : "N/A";
        },
      },
      {
        accessorKey: "state",
        header: "State",
        size: 100,
      },
      {
        accessorKey: "Code",
        header: "Code",
        size: 200,
        Cell: ({ cell }: { cell: any }) => {
          const data = cell.row.original.newData;

          return data.code;
        },
      },
      {
        accessorKey: "name",
        header: "name",
        size: 200,
        Cell: ({ cell }: { cell: any }) => {
          const data = cell.row.original.newData;

          return data.name;
        },
      },
      /* {
        accessorKey: "previousData",
        header: "Previous Data",
        size: 200,
        Cell: ({ cell }: { cell: any }) => {
          const data = cell.getValue();
          return data ? JSON.stringify(data).substring(0, 100) + "..." : "N/A";
        },
      },
      {
        accessorKey: "newData",
        header: "New Data",
        size: 200,
        Cell: ({ cell }: { cell: any }) => {
          const data = cell.getValue();
          return data ? JSON.stringify(data).substring(0, 100) + "..." : "N/A";
        },
      }, */
    ],
    []
  );

  // Only root rows with no managerId
  const rootData = useMemo(
    () => auditLogs?.filter((log) => !log.managerId) || [],
    [auditLogs]
  );

  // Configure the table
  const table = useMaterialReactTable({
    columns,
    data: rootData,
    enableExpanding: true,
    getSubRows: (row: any) =>
      auditLogs?.filter((log) => log.managerId === row.id) || [],
    state: {
      isLoading,
      showProgressBars: isLoading,
    },
    // Custom row props
    muiTableBodyRowProps: (row: any) => ({
      onClick: () => {
        console.log("Audit log details:", row.original);
      },
      sx: {
        cursor: "pointer",
        "&:hover": {
          backgroundColor: "rgba(0, 0, 0, 0.04)",
        },
      },
    }),
    // Custom styling
    muiTablePaperProps: {
      sx: {
        boxShadow: "none",
        border: "1px solid #e0e0e0",
      },
    },
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Audit Logs Hierarchy
          </h1>
          <div className="flex justify-center items-center h-64">
            <div className="text-lg text-gray-600">Loading audit logs...</div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Audit Logs Hierarchy
          </h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-red-800 font-semibold text-lg mb-2">
              Error loading audit logs
            </h3>
            <p className="text-red-600">
              {error instanceof Error
                ? error.message
                : "An unknown error occurred"}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!auditLogs || auditLogs.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Audit Logs Hierarchy
          </h1>
          <div className="flex justify-center items-center h-64">
            <div className="text-lg text-gray-500">
              No audit logs found for hierarchy ID: {hierarchyId}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Audit Logs Hierarchy
          </h1>
          <p className="text-gray-600 mt-2">
            Hierarchy ID: {hierarchyId} | Total logs: {auditLogs.length}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <MaterialReactTable table={table} />
        </div>

        {/* Additional information */}
        <div className="mt-4 text-sm text-gray-500">
          <p>
            Click on any row to view details. Expand rows to see hierarchical
            relationships.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuditLogsHierarchyPage;
