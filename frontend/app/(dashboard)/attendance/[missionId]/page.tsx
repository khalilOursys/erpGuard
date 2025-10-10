"use client";

import React, { useMemo, useState, useEffect } from "react";
import { MaterialReactTable } from "material-react-table";
import type {
  MRT_ColumnDef,
  MRT_Cell,
  MRT_TableInstance,
} from "material-react-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import dayjs from "dayjs";
import { toast } from "sonner";
import api from "@/lib/api";

interface AttendanceRecord {
  id: number;
  assignmentId: number;
  personnelId: number;
  personnelName: string;
  date: string;
  status:
    | "PRESENT"
    | "ABSENT"
    | "TIME_OFF"
    | "JUSTIFIED_ABSENCE"
    | "REPLACEMENT"
    | "EXTRA_TIME";
  checkIn?: string;
  checkOut?: string;
}

interface AgentData {
  id: number;
  name: string;
  personnelId: number;
  assignmentId: number;
  [key: string]: string | number | null;
}

interface BulkUpdatePayload {
  attendanceUpdates: {
    attendanceId: number;
    data: {
      status: string;
    };
  }[];
}

// API calls with proper error handling and response parsing
const fetchAttendanceByMission = async (
  missionId: number,
  companyId: number
): Promise<AttendanceRecord[]> => {
  try {
    const response = await api.get(
      `/missions/${missionId}/attendance?companyId=${companyId}`
    );

    console.log("📊 Raw API Response:", response);

    // Handle different response structures
    if (Array.isArray(response)) {
      console.log("✅ Using array response");
      return response;
    } else if (response?.data && Array.isArray(response.data)) {
      console.log("✅ Using response.data array");
      return response.data;
    } else if (response?.attendance && Array.isArray(response.attendance)) {
      console.log("✅ Using response.attendance array");
      return response.attendance;
    } else if (response?.records && Array.isArray(response.records)) {
      console.log("✅ Using response.records array");
      return response.records;
    }

    console.warn("❌ Unexpected API response structure:", response);
    toast.error("Unexpected data format from server");
    return [];
  } catch (error) {
    console.error("❌ Error fetching attendance:", error);
    toast.error("Failed to load attendance data");
    return [];
  }
};

const bulkUpdateAttendance = async (
  companyId: number,
  missionId: number,
  payload: BulkUpdatePayload
): Promise<any> => {
  try {
    console.log("🔄 Update payload:", { companyId, missionId, payload });

    // Try bulk update endpoint first
    try {
      const response = await api.put(
        `/missions/${missionId}/attendance/bulk-update?companyId=${companyId}`,
        payload
      );
      console.log("✅ Bulk update response:", response);
      return response?.data || response || { success: true };
    } catch (bulkError) {
      console.log("⚠️ Bulk update failed, trying individual updates...");

      // Fallback to individual updates
      const individualUpdates = await Promise.all(
        payload.attendanceUpdates.map(async (update) => {
          const individualResponse = await api.put(
            `/missions/${missionId}/attendance/${update.attendanceId}?companyId=${companyId}`,
            update.data
          );
          return individualResponse;
        })
      );

      console.log("✅ Individual updates completed:", individualUpdates);
      return { success: true, individualUpdates };
    }
  } catch (error) {
    console.error("❌ Error updating attendance:", error);
    throw error;
  }
};

const AttendancePage = () => {
  const params = useParams();
  const queryClient = useQueryClient();
  const [localUpdates, setLocalUpdates] = useState<Map<string, string>>(
    new Map()
  );
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [companyId, setCompanyId] = useState<number | null>(null);

  // Get missionId from URL and companyId from localStorage
  const missionId = params.missionId
    ? parseInt(params.missionId as string)
    : null;

  useEffect(() => {
    // Get companyId from localStorage on client side
    if (typeof window !== "undefined") {
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      if (storedUser?.companyId) {
        setCompanyId(storedUser.companyId);
      } else {
        console.error("❌ No companyId found in localStorage");
        toast.error("Company ID not found");
      }
    }
  }, []);

  // Fetch attendance data
  const {
    data: attendanceData = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "attendance",
      missionId,
      companyId,
      currentMonth.format("YYYY-MM"),
    ],
    queryFn: () => {
      if (!missionId || !companyId) {
        throw new Error("Mission ID or Company ID not available");
      }
      console.log("🔄 Fetching attendance for:", { missionId, companyId });
      return fetchAttendanceByMission(missionId, companyId);
    },
    enabled: !!missionId && !!companyId,
    retry: 2,
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: (payload: BulkUpdatePayload) => {
      if (!companyId) throw new Error("Company ID not available");
      if (!missionId) throw new Error("Mission ID not available");

      console.log("🎯 Mutation payload:", payload);
      return bulkUpdateAttendance(companyId, missionId, payload);
    },
    onSuccess: (data) => {
      console.log("✅ Update successful:", data);
      toast.success("Attendance updated successfully");

      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: [
          "attendance",
          missionId,
          companyId,
          currentMonth.format("YYYY-MM"),
        ],
      });

      // Clear local updates
      setLocalUpdates(new Map());
    },
    onError: (error: Error) => {
      console.error("❌ Update failed:", error);
      toast.error(`Failed to update attendance: ${error.message}`);

      // Revert local updates on error
      setLocalUpdates(new Map());

      // Refetch to get latest data
      refetch();
    },
  });

  // Map BE status to FE display values
  const mapStatusToDisplay = (status: string): string => {
    switch (status) {
      case "PRESENT":
      case "REPLACEMENT":
      case "EXTRA_TIME":
        return "Present";
      case "ABSENT":
        return "Absent";
      case "TIME_OFF":
      case "JUSTIFIED_ABSENCE":
        return "Leave";
      default:
        return "Present";
    }
  };

  // Map FE display to BE status
  const mapDisplayToStatus = (display: string): string => {
    switch (display) {
      case "Present":
        return "PRESENT";
      case "Absent":
        return "ABSENT";
      case "Leave":
        return "TIME_OFF";
      default:
        return "PRESENT";
    }
  };

  // Transform BE data to FE table format
  const tableData = useMemo((): AgentData[] => {
    console.log(
      "🔄 Transforming table data, attendance records:",
      attendanceData.length
    );

    if (!attendanceData.length) {
      console.log("📭 No attendance data available");
      return [];
    }

    // Group by personnel
    const personnelMap = new Map<number, AgentData>();

    attendanceData.forEach((record) => {
      console.log("📝 Processing record:", record);

      if (!personnelMap.has(record.personnelId)) {
        personnelMap.set(record.personnelId, {
          id: record.personnelId,
          name: record.personnelName,
          personnelId: record.personnelId,
          assignmentId: record.assignmentId,
        });
      }

      const agent = personnelMap.get(record.personnelId)!;
      const dayNumber = dayjs(record.date).date();
      const dayKey = `day${dayNumber}`;

      // Apply local updates if they exist
      const updateKey = `${record.personnelId}-${dayNumber}`;
      if (localUpdates.has(updateKey)) {
        agent[dayKey] = localUpdates.get(updateKey) as string | null;
        console.log(
          `🔄 Applied local update for ${dayKey}:`,
          localUpdates.get(updateKey)
        );
      } else {
        // Map BE status to FE display values
        agent[dayKey] = mapStatusToDisplay(record.status);
        console.log(
          `📊 Mapped status for ${dayKey}: ${record.status} -> ${agent[dayKey]}`
        );
      }
    });

    // Fill all days for the current month
    const daysInMonth = currentMonth.daysInMonth();
    console.log(`📅 Filling ${daysInMonth} days for month`);

    personnelMap.forEach((agent, personnelId) => {
      for (let day = 1; day <= daysInMonth; day++) {
        const dayKey = `day${day}`;
        if (!agent[dayKey]) {
          agent[dayKey] = null;
        }
      }
    });

    const result = Array.from(personnelMap.values());
    console.log("🎉 Final table data:", result);
    return result;
  }, [attendanceData, localUpdates, currentMonth]);

  // Get color based on status
  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "Present":
        return { backgroundColor: "#d1fae5", color: "#065f46" };
      case "Absent":
        return { backgroundColor: "#fee2e2", color: "#991b1b" };
      case "Leave":
        return { backgroundColor: "#fef3c7", color: "#92400e" };
      default:
        return { backgroundColor: "#f9fafb", color: "#6b7280" };
    }
  };

  // Custom cell component with colors
  const StatusCell = ({ cell }: { cell: MRT_Cell<AgentData> }) => {
    const value = cell.getValue<string | null>();
    const colors = getStatusColor(value);

    return (
      <div
        style={{
          textAlign: "center",
          padding: "4px 8px",
          borderRadius: "4px",
          fontWeight: "500",
          cursor: "pointer",
          minHeight: "32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...colors,
        }}
      >
        {value || "-"}
      </div>
    );
  };

  // Custom edit component with colors
  const CustomSelectEdit = ({
    cell,
    table,
  }: {
    cell: MRT_Cell<AgentData>;
    table: MRT_TableInstance<AgentData>;
  }) => {
    const value = cell.getValue<string | null>();
    const colors = getStatusColor(value);

    return (
      <select
        value={value || ""}
        onChange={(e) => {
          table.setEditingCell(null);
          handleSaveCell(cell, e.target.value || null);
        }}
        onBlur={() => table.setEditingCell(null)}
        style={{
          width: "100%",
          height: "100%",
          textAlign: "center",
          border: "none",
          outline: "none",
          background: "transparent",
          cursor: "pointer",
          ...colors,
        }}
        autoFocus
      >
        <option value="">-</option>
        <option value="Present">Present</option>
        <option value="Absent">Absent</option>
        <option value="Leave">Leave</option>
      </select>
    );
  };

  const columns = useMemo<MRT_ColumnDef<AgentData>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Agent Name",
        size: 180,
        enableEditing: false,
        muiTableHeadCellProps: { align: "center" as const },
        muiTableBodyCellProps: { align: "center" as const },
      },
      ...Array.from({ length: currentMonth.daysInMonth() }, (_, i) => {
        const dayKey = `day${i + 1}`;
        return {
          accessorKey: dayKey,
          header: (i + 1).toString(),
          size: 80,
          Cell: ({ cell }: { cell: MRT_Cell<AgentData> }) => (
            <StatusCell cell={cell} />
          ),
          enableEditing: true,
          Edit: ({
            cell,
            table,
          }: {
            cell: MRT_Cell<AgentData>;
            table: MRT_TableInstance<AgentData>;
          }) => <CustomSelectEdit cell={cell} table={table} />,
          muiTableHeadCellProps: { align: "center" as const },
          muiTableBodyCellProps: { align: "center" as const },
        };
      }),
    ],
    [currentMonth]
  );

  const handleSaveCell = (cell: MRT_Cell<AgentData>, value: any) => {
    const row = cell.row.original;
    const dayNumber = parseInt(cell.column.id.replace("day", ""));

    // Create the date string for the current month and day
    const dateString = currentMonth.date(dayNumber).format("YYYY-MM-DD");

    console.log("💾 Saving cell:", {
      personnelId: row.personnelId,
      dayNumber,
      dateString,
      value,
      currentMonth: currentMonth.format("YYYY-MM"),
    });

    // Store local update immediately for responsive UI
    const updateKey = `${row.personnelId}-${dayNumber}`;
    setLocalUpdates((prev) => new Map(prev.set(updateKey, value)));

    // Find the original attendance record
    const originalRecord = attendanceData.find(
      (record) =>
        record.personnelId === row.personnelId &&
        dayjs(record.date).isSame(dateString, "day")
    );

    console.log("🔍 Original record search:", {
      personnelId: row.personnelId,
      dateString,
      foundRecord: originalRecord,
      allRecords: attendanceData.map((r) => ({
        id: r.id,
        personnelId: r.personnelId,
        date: r.date,
      })),
    });

    if (originalRecord) {
      const updatePayload: BulkUpdatePayload = {
        attendanceUpdates: [
          {
            attendanceId: originalRecord.id,
            data: {
              status: mapDisplayToStatus(value || "PRESENT"),
            },
          },
        ],
      };

      console.log("🚀 Sending update payload:", updatePayload);
      bulkUpdateMutation.mutate(updatePayload);
    } else {
      console.warn("❌ No attendance record found for update");
      toast.error("No attendance record found for this date");

      // Revert local update if no record found
      setTimeout(() => {
        setLocalUpdates((prev) => {
          const newMap = new Map(prev);
          newMap.delete(updateKey);
          return newMap;
        });
      }, 100);
    }
  };

  // Month navigation
  const handlePreviousMonth = () => {
    setCurrentMonth((prev) => prev.subtract(1, "month"));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => prev.add(1, "month"));
  };

  // Show loading if missionId or companyId not available
  if (!missionId || !companyId) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading mission information...</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading attendance data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">
          Error loading attendance data: {(error as Error).message}
        </div>
        <button
          onClick={() => refetch()}
          className="ml-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen attendance">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-700">
          Agent Attendance – {currentMonth.format("MMMM YYYY")}
        </h2>
        <div className="flex gap-4 items-center">
          <div className="text-sm text-gray-600">
            Records: {attendanceData.length} | Agents: {tableData.length}
          </div>
          <button
            onClick={handlePreviousMonth}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Previous Month
          </button>
          <button
            onClick={handleNextMonth}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Next Month
          </button>
        </div>
      </div>

      {bulkUpdateMutation.isPending && (
        <div className="mb-4 p-2 bg-blue-100 text-blue-700 rounded">
          Updating attendance...
        </div>
      )}

      <div className="mb-4 flex gap-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
          <span className="text-sm">Present</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
          <span className="text-sm">Absent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
          <span className="text-sm">Leave</span>
        </div>
      </div>

      <MaterialReactTable
        columns={columns}
        data={tableData}
        enableEditing={true}
        enableRowActions={false}
        enableColumnActions={false}
        enableColumnResizing={true}
        enableStickyHeader={true}
        enablePagination={false}
        enableBottomToolbar={false}
        muiTableContainerProps={{
          sx: { maxHeight: "600px" },
        }}
        muiTablePaperProps={{
          sx: { boxShadow: "none", border: "1px solid #e0e0e0" },
        }}
        muiTableProps={{
          sx: {
            "& .MuiTableCell-root": {
              border: "1px solid #e0e0e0",
              padding: "4px 2px",
            },
          },
        }}
        muiTableHeadCellProps={{
          sx: {
            backgroundColor: "#f9fafb",
            fontWeight: "600",
          },
        }}
        editDisplayMode="cell"
      />
    </div>
  );
};

export default AttendancePage;
