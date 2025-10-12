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
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Alert,
  Menu,
  IconButton,
  Tooltip,
} from "@mui/material";
import { PersonAdd as PersonAddIcon } from "@mui/icons-material";

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
  personnelNameR?: string;
}

interface AgentData {
  id: number;
  name: string;
  personnelId: number;
  assignmentId: number;
  [key: string]: string | number | null;
}

interface Personnel {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: string;
}

interface BulkUpdatePayload {
  attendanceUpdates: {
    attendanceId: number;
    data: {
      status: string;
    };
  }[];
}

// API calls
const fetchAttendanceByMission = async (
  missionId: number,
  companyId: number,
  date: string
): Promise<AttendanceRecord[]> => {
  try {
    const response = await api.get(
      `/missions/${missionId}/attendance?companyId=${companyId}&date=${date}`
    );

    if (Array.isArray(response)) {
      return response;
    } else if (response?.data && Array.isArray(response.data)) {
      return response.data;
    } else if (response?.attendance && Array.isArray(response.attendance)) {
      return response.attendance;
    } else if (response?.records && Array.isArray(response.records)) {
      return response.records;
    }

    toast.error("Unexpected data format from server");
    return [];
  } catch (error) {
    console.error("Error fetching attendance:", error);
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
    const response = await api.put(
      `/missions/${missionId}/attendance/bulk-update?companyId=${companyId}`,
      payload
    );
    return response?.data || response || { success: true };
  } catch (bulkError) {
    console.log("Bulk update failed, trying individual updates...");

    const individualUpdates = await Promise.all(
      payload.attendanceUpdates.map(async (update) => {
        try {
          const individualResponse = await api.put(
            `/missions/${missionId}/attendance/${update.attendanceId}?companyId=${companyId}`,
            update.data
          );
          return individualResponse;
        } catch (error) {
          console.error(
            `Failed to update attendance ${update.attendanceId}:`,
            error
          );
          throw error;
        }
      })
    );

    return { success: true, individualUpdates };
  }
};

const fetchAvailablePersonnel = async (
  companyId: number
): Promise<Personnel[]> => {
  try {
    const response = await api.get(
      `/personnels/findAllPersonnels?companyId=${companyId}`
    );
    return Array.isArray(response) ? response : response?.data || [];
  } catch (error) {
    console.error("Failed to fetch personnel:", error);
    toast.error("Failed to load personnel data");
    return [];
  }
};

// CORRECTED: createReplacement function to match backend API
const createReplacement = async (
  missionId: number,
  companyId: number,
  replacementData: {
    assignmentId: number;
    startDate: string;
    endDate: string;
    replacementForId?: number;
  }
): Promise<any> => {
  try {
    const response = await api.post(
      `/missions/${missionId}/attendance/replacements?companyId=${companyId}`,
      replacementData
    );
    return response?.data || response;
  } catch (error) {
    console.error("Failed to create replacement:", error);
    throw error;
  }
};

// CORRECTED: Replacement Modal Component
const ReplacementModal = ({
  open,
  onClose,
  onConfirm,
  originalAgent,
  selectedDate,
  availablePersonnel,
  tableData,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: {
    assignmentId: number;
    startDate: string;
    endDate: string;
    replacementForId?: number;
  }) => void;
  originalAgent: { id: number; name: string; assignmentId: number } | null;
  selectedDate: string;
  availablePersonnel: Personnel[];
  tableData: AgentData[];
}) => {
  const [selectedReplacementId, setSelectedReplacementId] = useState<number>(0);
  const [selectedReplacementForId, setSelectedReplacementForId] =
    useState<number>(0);
  const [startDate, setStartDate] = useState(selectedDate);
  const [endDate, setEndDate] = useState(selectedDate);

  useEffect(() => {
    if (open) {
      if (originalAgent) {
        setSelectedReplacementForId(originalAgent.id);
      } else {
        setSelectedReplacementForId(0);
      }
      setSelectedReplacementId(0);
      setStartDate(selectedDate);
      setEndDate(selectedDate);
    }
  }, [open, originalAgent, selectedDate]);

  // Get assignment ID for replacement personnel
  const getAssignmentIdForPersonnel = (personnelId: number): number | null => {
    const agent = tableData.find((a) => a.personnelId === personnelId);
    return agent?.assignmentId || null;
  };

  const getReplacementForName = () => {
    if (originalAgent) {
      return originalAgent.name;
    }
    if (selectedReplacementForId > 0) {
      const agent = tableData.find(
        (a) => a.personnelId === selectedReplacementForId
      );
      return agent?.name || "Unknown Agent";
    }
    return "Select Agent";
  };

  const handleConfirm = () => {
    if (selectedReplacementId && startDate && endDate) {
      const assignmentId = getAssignmentIdForPersonnel(
        selectedReplacementForId
      );

      if (!assignmentId) {
        toast.error("Selected replacement personnel has no assignment");
        return;
      }

      if (selectedReplacementId === selectedReplacementForId) {
        toast.error(
          "Replacement personnel cannot be the same as the agent being replaced"
        );
        return;
      }

      if (new Date(startDate) > new Date(endDate)) {
        toast.error("Start date cannot be after end date");
        return;
      }

      // CORRECTED: Send the payload structure that matches backend API
      const replacementData = {
        assignmentId,
        startDate,
        endDate,
        replacementForId:
          selectedReplacementForId > 0 ? selectedReplacementForId : undefined,
      };

      onConfirm(replacementData);
    } else {
      toast.error("Please select replacement personnel and date range");
    }
  };

  const handleClose = () => {
    setSelectedReplacementId(0);
    setSelectedReplacementForId(0);
    setStartDate(selectedDate);
    setEndDate(selectedDate);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Assign Replacement</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={3} mt={2}>
          <Alert severity="info">
            {originalAgent ? (
              <>
                Setting replacement for <strong>{originalAgent.name}</strong>
              </>
            ) : (
              <>Assign replacement for selected period</>
            )}
          </Alert>

          <TextField
            select
            label="Agent Being Replaced"
            value={selectedReplacementForId}
            onChange={(e) =>
              setSelectedReplacementForId(Number(e.target.value))
            }
            fullWidth
            required
            disabled={!!originalAgent}
          >
            <MenuItem value={0}>Select Agent to Replace</MenuItem>
            {tableData.map((agent) => (
              <MenuItem key={agent.personnelId} value={agent.personnelId}>
                {agent.name} (ID: {agent.personnelId})
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Select Replacement Personnel"
            value={selectedReplacementId}
            onChange={(e) => setSelectedReplacementId(Number(e.target.value))}
            fullWidth
            required
          >
            <MenuItem value={0}>Select Replacement</MenuItem>
            {availablePersonnel
              .filter(
                (person) =>
                  !selectedReplacementForId ||
                  person.id !== selectedReplacementForId
              )
              .map((personnel) => (
                <MenuItem key={personnel.id} value={personnel.id}>
                  {personnel.name} - {personnel.email}
                </MenuItem>
              ))}
          </TextField>

          <Box display="flex" gap={2}>
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
              required
            />
          </Box>

          {startDate && endDate && (
            <Alert severity="warning">
              This will set replacement status for{" "}
              {dayjs(endDate).diff(dayjs(startDate), "day") + 1} days from{" "}
              {dayjs(startDate).format("MMM D, YYYY")} to{" "}
              {dayjs(endDate).format("MMM D, YYYY")}
              {selectedReplacementForId > 0 && (
                <>
                  {" "}
                  for <strong>{getReplacementForName()}</strong>
                </>
              )}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!selectedReplacementId || !startDate || !endDate}
        >
          Assign Replacement
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const AttendancePage = () => {
  const params = useParams();
  const queryClient = useQueryClient();
  const [localUpdates, setLocalUpdates] = useState<Map<string, string>>(
    new Map()
  );
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [companyId, setCompanyId] = useState<number | null>(null);

  // Replacement popup states
  const [replacementModalOpen, setReplacementModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{
    id: number;
    name: string;
    assignmentId: number;
    date: string;
    dayNumber: number;
  } | null>(null);
  const [availablePersonnel, setAvailablePersonnel] = useState<Personnel[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    cell?: MRT_Cell<AgentData>;
  } | null>(null);

  // Get missionId from URL and companyId from localStorage
  const missionId = params.missionId
    ? parseInt(params.missionId as string)
    : null;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      if (storedUser?.companyId) {
        setCompanyId(storedUser.companyId);
      } else {
        console.error("No companyId found in localStorage");
        toast.error("Company ID not found");
      }
    }
  }, []);

  // Fetch available personnel for replacements
  useEffect(() => {
    const fetchPersonnel = async () => {
      if (companyId) {
        const personnelData = await fetchAvailablePersonnel(companyId);
        setAvailablePersonnel(personnelData);
      }
    };
    fetchPersonnel();
  }, [companyId]);

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
      return fetchAttendanceByMission(
        missionId,
        companyId,
        currentMonth.format("YYYY-MM")
      );
    },
    enabled: !!missionId && !!companyId,
    retry: 2,
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: (payload: BulkUpdatePayload) => {
      if (!companyId) throw new Error("Company ID not available");
      if (!missionId) throw new Error("Mission ID not available");
      return bulkUpdateAttendance(companyId, missionId, payload);
    },
    onSuccess: (data) => {
      toast.success("Attendance updated successfully");
      queryClient.invalidateQueries({
        queryKey: [
          "attendance",
          missionId,
          companyId,
          currentMonth.format("YYYY-MM"),
        ],
      });
      setLocalUpdates(new Map());
    },
    onError: (error: Error) => {
      console.error("Update failed:", error);
      toast.error(`Failed to update attendance: ${error.message}`);
      setLocalUpdates(new Map());
      refetch();
    },
  });

  // CORRECTED: Replacement creation mutation
  const createReplacementMutation = useMutation({
    mutationFn: (replacementData: {
      assignmentId: number;
      startDate: string;
      endDate: string;
      replacementForId?: number;
    }) => {
      if (!missionId || !companyId) {
        throw new Error("Missing required data");
      }
      return createReplacement(missionId, companyId, replacementData);
    },
    onSuccess: (data) => {
      toast.success(`Replacement assigned successfully`);
      setReplacementModalOpen(false);
      setSelectedCell(null);

      queryClient.invalidateQueries({
        queryKey: [
          "attendance",
          missionId,
          companyId,
          currentMonth.format("YYYY-MM"),
        ],
      });
    },
    onError: (error: Error) => {
      console.error("Failed to create replacement:", error);
      toast.error(`Failed to assign replacement: ${error.message}`);
    },
  });

  // Map BE status to FE display values
  const mapStatusToDisplay = (status: string): string => {
    switch (status) {
      case "PRESENT":
      case "EXTRA_TIME":
        return "P";
      case "ABSENT":
        return "A";
      case "TIME_OFF":
      case "JUSTIFIED_ABSENCE":
        return "L";
      case "REPLACEMENT":
        return "R";
      default:
        return "P";
    }
  };

  // Map FE display to BE status
  const mapDisplayToStatus = (display: string): string => {
    switch (display) {
      case "R":
        return "REPLACEMENT";
      case "P":
        return "PRESENT";
      case "A":
        return "ABSENT";
      case "L":
        return "TIME_OFF";
      default:
        return "PRESENT";
    }
  };

  // Transform BE data to FE table format
  const tableData = useMemo((): AgentData[] => {
    if (!attendanceData.length) {
      return [];
    }

    const personnelMap = new Map<number, AgentData>();

    attendanceData.forEach((record) => {
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

      const updateKey = `${record.personnelId}-${dayNumber}`;
      if (localUpdates.has(updateKey)) {
        agent[dayKey] = localUpdates.get(updateKey) as string | null;
      } else {
        agent[dayKey] = mapStatusToDisplay(record.status);
      }
    });

    // Fill all days for the current month
    const daysInMonth = currentMonth.daysInMonth();
    personnelMap.forEach((agent) => {
      for (let day = 1; day <= daysInMonth; day++) {
        const dayKey = `day${day}`;
        if (!agent[dayKey]) {
          agent[dayKey] = null;
        }
      }
    });

    return Array.from(personnelMap.values());
  }, [attendanceData, localUpdates, currentMonth]);

  // Get color based on status
  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "P":
        return { backgroundColor: "#d1fae5", color: "#065f46" };
      case "A":
        return { backgroundColor: "#fee2e2", color: "#991b1b" };
      case "R":
        return { backgroundColor: "#fef3c7", color: "#92400e" };
      case "L":
        return { backgroundColor: "#e0e7ff", color: "#3730a3" };
      default:
        return { backgroundColor: "#f9fafb", color: "#6b7280" };
    }
  };

  // Enhanced StatusCell with context menu
  const StatusCell = ({ cell }: { cell: MRT_Cell<AgentData> }) => {
    const value = cell.getValue<string | null>();
    const colors = getStatusColor(value);

    const handleContextMenu = (event: React.MouseEvent) => {
      event.preventDefault();
      setContextMenu(
        contextMenu === null
          ? { mouseX: event.clientX - 2, mouseY: event.clientY - 4, cell }
          : null
      );
    };

    return (
      <div
        style={{
          textAlign: "center",
          padding: "4px 8px",
          borderRadius: "4px",
          fontWeight: "500",
          cursor: "context-menu",
          minHeight: "32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...colors,
        }}
        onContextMenu={handleContextMenu}
      >
        {value || "-"}
      </div>
    );
  };

  // Custom edit component
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
        <option value="P">Present</option>
        <option value="A">Absent</option>
        <option value="L">Leave</option>
        <option value="R">Replacement</option>
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

    const dateString = currentMonth.date(dayNumber).format("YYYY-MM-DD");

    // Store local update immediately for responsive UI
    const updateKey = `${row.personnelId}-${dayNumber}`;
    setLocalUpdates((prev) => new Map(prev.set(updateKey, value)));

    // Find the original attendance record
    const originalRecord = attendanceData.find(
      (record) =>
        record.personnelId === row.personnelId &&
        dayjs(record.date).isSame(dateString, "day")
    );

    if (originalRecord) {
      const updatePayload: BulkUpdatePayload = {
        attendanceUpdates: [
          {
            attendanceId: originalRecord.id,
            data: {
              status: mapDisplayToStatus(value || "P"),
            },
          },
        ],
      };

      bulkUpdateMutation.mutate(updatePayload);
    } else {
      console.warn("No attendance record found for update");
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

  // Handle replacement assignment from context menu
  const handleSetReplacement = () => {
    if (contextMenu?.cell) {
      const row = contextMenu.cell.row.original;
      const dayNumber = parseInt(contextMenu.cell.column.id.replace("day", ""));
      const dateString = currentMonth.date(dayNumber).format("YYYY-MM-DD");

      setSelectedCell({
        id: row.personnelId,
        name: row.name,
        assignmentId: row.assignmentId,
        date: dateString,
        dayNumber,
      });
      setReplacementModalOpen(true);
    }
    setContextMenu(null);
  };

  // Handle manual replacement button click
  const handleManualReplacement = () => {
    setSelectedCell(null);
    setReplacementModalOpen(true);
  };

  // CORRECTED: Handle replacement confirmation
  const handleReplacementConfirm = (replacementData: {
    assignmentId: number;
    startDate: string;
    endDate: string;
    replacementForId?: number;
  }) => {
    createReplacementMutation.mutate(replacementData);
  };

  // Month navigation
  const handlePreviousMonth = () => {
    setCurrentMonth((prev) => prev.subtract(1, "month"));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => prev.add(1, "month"));
  };

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

          {/* Manual Replacement Button */}
          <Tooltip title="Assign Replacement">
            <IconButton
              onClick={handleManualReplacement}
              sx={{
                backgroundColor: "#1976d2",
                color: "white",
                "&:hover": {
                  backgroundColor: "#1565c0",
                },
              }}
            >
              <PersonAddIcon />
            </IconButton>
          </Tooltip>

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

      {(bulkUpdateMutation.isPending ||
        createReplacementMutation.isPending) && (
        <div className="mb-4 p-2 bg-blue-100 text-blue-700 rounded">
          Updating attendance...
        </div>
      )}

      <div className="mb-4 flex gap-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
          <span className="text-sm">P: Present</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
          <span className="text-sm">A: Absent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
          <span className="text-sm">R: Replacement</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
          <span className="text-sm">L: Leave/Time Off</span>
        </div>
      </div>

      <MaterialReactTable
        columns={columns}
        data={tableData}
        enableEditing={false}
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

      {/* Context Menu for Replacement */}
      <Menu
        open={contextMenu !== null}
        onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={handleSetReplacement}>
          Set Replacement for this period
        </MenuItem>
      </Menu>

      {/* Replacement Modal */}
      <ReplacementModal
        open={replacementModalOpen}
        onClose={() => setReplacementModalOpen(false)}
        onConfirm={handleReplacementConfirm}
        originalAgent={selectedCell}
        selectedDate={selectedCell?.date || dayjs().format("YYYY-MM-DD")}
        availablePersonnel={availablePersonnel}
        tableData={tableData}
      />
    </div>
  );
};

export default AttendancePage;
