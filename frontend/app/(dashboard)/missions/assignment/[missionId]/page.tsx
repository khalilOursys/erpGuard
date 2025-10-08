"use client";

import React, { useMemo, useState, useEffect } from "react";
import { MaterialReactTable } from "material-react-table";
import type {
  MRT_ColumnDef,
  MRT_Cell,
  MRT_TableInstance,
} from "material-react-table";
import {
  Box,
  IconButton,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Alert,
  FormControlLabel,
  Switch,
} from "@mui/material";
import {
  PersonAdd as PersonAddIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import api from "@/lib/api";
import { useParams } from "next/navigation";
interface Assignment {
  id: number;
  personnelId: number;
  missionId: number;
  post: string | null;
  role: string | null;
  isReplacement: boolean;
  personnel: {
    id: number;
    name: string;
    email: string;
    phone: string;
  };
  attendances?: Array<{
    id: number;
    date: string;
    status: string;
    hours: number;
  }>;
}

interface Personnel {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: string;
}

interface Mission {
  id: number;
  contractId: number;
  siteId?: number;
  startDate: string;
  endDate: string;
  requiredPersonnel: number;
  assignments: Assignment[];
  contract: {
    contractNumber: string;
    client: {
      name: string;
    };
  };
  site?: {
    name: string;
  };
}

const STATIC_PERSONNEL = [
  {
    id: 3,
    companyId: 1,
    firstName: "Sana",
    lastName: "Cleaner",
    identifier: null,
    email: "sana.clean@example.com",
    phone: null,
    hireDate: "2025-10-08T11:13:27.590Z",
    baseSalary: "600",
    serviceId: 3,
    createdAt: "2025-10-08T11:13:27.590Z",
    updatedAt: "2025-10-08T11:13:27.590Z",
    isDeleted: false,
    deletedAt: null,
  },
  {
    id: 2,
    companyId: 1,
    firstName: "Amy",
    lastName: "Cook",
    identifier: null,
    email: "amy.cook@example.com",
    phone: null,
    hireDate: "2025-10-08T11:13:27.589Z",
    baseSalary: "800",
    serviceId: 2,
    createdAt: "2025-10-08T11:13:27.589Z",
    updatedAt: "2025-10-08T11:13:27.589Z",
    isDeleted: false,
    deletedAt: null,
  },
  {
    id: 1,
    companyId: 1,
    firstName: "John",
    lastName: "Guard",
    identifier: null,
    email: "john.guard@example.com",
    phone: null,
    hireDate: "2025-10-08T11:13:27.586Z",
    baseSalary: "1000",
    serviceId: 1,
    createdAt: "2025-10-08T11:13:27.586Z",
    updatedAt: "2025-10-08T11:13:27.586Z",
    isDeleted: false,
    deletedAt: null,
  },
];
const MissionAssignmentsPage = () => {
  const params = useParams();
  const missionId = params.missionId
    ? parseInt(params.missionId as string)
    : undefined;
  const [mission, setMission] = useState<Mission | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [availablePersonnel, setAvailablePersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog states
  const [addAssignmentModalOpen, setAddAssignmentModalOpen] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    personnelId: 0,
    post: "",
    role: "",
    isReplacement: false,
  });

  // Fetch mission and assignments
  const fetchMissionData = async () => {
    setLoading(true);
    try {
      // Fetch mission details
      const missionData = await api.get(`/missions/${missionId}`);
      setMission(missionData);

      // Fetch assignments for this mission
      const assignmentsData = await api.get(
        `/missions/${missionId}/assignments`
      );
      setAssignments(assignmentsData);

      // Fetch available personnel
      /* const personnelResponse = await api.get(`/personnel?available=true`);
      const personnelData = await personnelResponse.json();
      setAvailablePersonnel(personnelData); */
      setAvailablePersonnel(
        STATIC_PERSONNEL.map((person) => ({
          id: person.id,
          name: `${person.firstName} ${person.lastName}`,
          email: person.email,
          phone: person.phone || "", // Handle null phone
          status: "active", // Default status
        }))
      );
    } catch (error) {
      console.error("Failed to fetch mission data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log(missionId);

    if (missionId) {
      fetchMissionData();
    }
  }, [missionId]);

  // Handle adding new assignment
  const handleAddAssignment = async () => {
    if (!newAssignment.personnelId) {
      alert("Please select personnel");
      return;
    }

    setSaving(true);
    try {
      await api.post(`/missions/${missionId}/assignments`);

      setAddAssignmentModalOpen(false);
      setNewAssignment({
        personnelId: 0,
        post: "",
        role: "",
        isReplacement: false,
      });
      fetchMissionData(); // Refresh data
    } catch (error) {
      console.error("Failed to add assignment:", error);
    } finally {
      setSaving(false);
    }
  };

  // Handle cell edits for assignments
  const handleSaveCell = async (cell: MRT_Cell<Assignment>, value: any) => {
    const assignmentId = cell.row.original.id;
    const field = cell.column.id as keyof Assignment;

    setSaving(true);
    try {
      await api.patch(`/missions/${missionId}/assignments/${assignmentId}`);

      // Update local state
      setAssignments((prev) =>
        prev.map((assignment) =>
          assignment.id === assignmentId
            ? { ...assignment, [field]: value }
            : assignment
        )
      );
    } catch (error) {
      console.error("Failed to update assignment:", error);
    } finally {
      setSaving(false);
    }
  };

  // Custom cell components with editing
  const EditableCell = ({
    cell,
    table,
  }: {
    cell: MRT_Cell<Assignment>;
    table: MRT_TableInstance<Assignment>;
  }) => {
    const value = cell.getValue();
    const [editingValue, setEditingValue] = useState(value);

    if (cell.column.id === "isReplacement") {
      return (
        <Chip
          label={value ? "Yes" : "No"}
          color={value ? "warning" : "default"}
          size="small"
        />
      );
    }

    return (
      <Box
        onClick={() => table.setEditingCell(cell)}
        sx={{
          padding: "8px",
          borderRadius: "4px",
          cursor: "pointer",
          "&:hover": { backgroundColor: "#f5f5f5" },
        }}
      ></Box>
    );
  };

  const CustomEditComponent = ({
    cell,
    table,
  }: {
    cell: MRT_Cell<Assignment>;
    table: MRT_TableInstance<Assignment>;
  }) => {
    const value = cell.getValue();

    if (cell.column.id === "post") {
      return (
        <select
          value={(value as string) || ""}
          onChange={(e) => {
            table.setEditingCell(null);
            handleSaveCell(cell, e.target.value || null);
          }}
          style={{
            width: "100%",
            padding: "8px",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
          autoFocus
        >
          <option value="">Select Post</option>
          <option value="Security Guard">Security Guard</option>
          <option value="Supervisor">Supervisor</option>
          <option value="Team Leader">Team Leader</option>
          <option value="Patrol Officer">Patrol Officer</option>
        </select>
      );
    }

    if (cell.column.id === "role") {
      return (
        <select
          value={(value as string) || ""}
          onChange={(e) => {
            table.setEditingCell(null);
            handleSaveCell(cell, e.target.value || null);
          }}
          style={{
            width: "100%",
            padding: "8px",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
          autoFocus
        >
          <option value="">Select Role</option>
          <option value="Primary">Primary</option>
          <option value="Backup">Backup</option>
          <option value="Support">Support</option>
        </select>
      );
    }

    if (cell.column.id === "isReplacement") {
      return (
        <select
          value={value ? "true" : "false"}
          onChange={(e) => {
            table.setEditingCell(null);
            handleSaveCell(cell, e.target.value === "true");
          }}
          style={{
            width: "100%",
            padding: "8px",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
          autoFocus
        >
          <option value="false">No</option>
          <option value="true">Yes</option>
        </select>
      );
    }

    return (
      <input
        type="text"
        value={(value as string) || ""}
        /* onChange={(e) => setEditingValue(e.target.value)} */
        onBlur={() => {
          table.setEditingCell(null);
          /* handleSaveCell(cell, editingValue); */
        }}
        onKeyPress={(e) => {
          if (e.key === "Enter") {
            table.setEditingCell(null);
            /* handleSaveCell(cell, editingValue); */
          }
        }}
        style={{
          width: "100%",
          padding: "8px",
          border: "1px solid #ccc",
          borderRadius: "4px",
        }}
        autoFocus
      />
    );
  };

  const columns = useMemo<MRT_ColumnDef<Assignment>[]>(
    () => [
      {
        accessorKey: "personnel.name",
        header: "Personnel Name",
        size: 200,
        enableEditing: false,
        Cell: ({ cell }) => (
          <Box>
            <div style={{ fontWeight: "bold" }}>
              {cell.getValue() as string}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#666" }}>
              {cell.row.original.personnel.email}
            </div>
          </Box>
        ),
      },
      {
        accessorKey: "post",
        header: "Post",
        size: 150,
      },
      {
        accessorKey: "isReplacement",
        header: "Replacement",
        size: 120,
        Cell: EditableCell,
        Edit: CustomEditComponent,
      },
      {
        accessorKey: "personnel.phone",
        header: "Phone",
        size: 140,
        enableEditing: false,
      },
      {
        id: "actions",
        header: "Actions",
        size: 100,
        enableEditing: false,
        Cell: ({ row }) => (
          <Tooltip title="Remove Assignment">
            <IconButton
              size="small"
              onClick={async () => {
                if (confirm("Remove this personnel from mission?")) {
                  try {
                    await api.delete(
                      `/missions/${missionId}/assignments/${row.original.id}`
                    );
                    fetchMissionData();
                  } catch (error) {
                    console.error("Failed to remove assignment:", error);
                  }
                }
              }}
            >
              <PersonAddIcon />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    []
  );

  if (loading) {
    return <Box p={3}>Loading mission assignments...</Box>;
  }

  if (!mission) {
    return <Box p={3}>Mission not found</Box>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Mission Header */}
      <Box mb={4} p={3} bgcolor="white" borderRadius={2} boxShadow={1}>
        <h2 className="text-2xl font-bold mb-2">
          Assignments - {mission.contract.client.name}
        </h2>
        <p className="text-gray-600 mb-2">
          Contract: {mission.contract.contractNumber} | Site:{" "}
          {mission.site?.name || "No Site"} | Required Personnel:{" "}
          {mission.requiredPersonnel}
        </p>
        <p className="text-sm text-gray-500">
          Period: {new Date(mission.startDate).toLocaleDateString()} -{" "}
          {new Date(mission.endDate).toLocaleDateString()}
        </p>

        <Box mt={2} display="flex" gap={2} alignItems="center">
          <Alert
            severity={
              assignments.length >= mission.requiredPersonnel
                ? "success"
                : "warning"
            }
            sx={{ flex: 1 }}
          >
            {assignments.length} / {mission.requiredPersonnel} personnel
            assigned
          </Alert>

          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => setAddAssignmentModalOpen(true)}
          >
            Add Personnel
          </Button>
        </Box>
      </Box>

      {/* Assignments Table */}
      <MaterialReactTable
        columns={columns}
        data={assignments}
        enableEditing={true}
        enableRowActions={false}
        enableColumnActions={false}
        enableColumnResizing={true}
        enableStickyHeader={true}
        enablePagination={false}
        enableBottomToolbar={false}
        state={{
          isLoading: saving,
        }}
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
              padding: "8px",
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

      {/* Add Assignment Dialog */}
      <Dialog
        open={addAssignmentModalOpen}
        onClose={() => setAddAssignmentModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Personnel to Mission</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={2}>
            <TextField
              select
              label="Select Personnel"
              value={newAssignment.personnelId}
              onChange={(e) =>
                setNewAssignment((prev) => ({
                  ...prev,
                  personnelId: parseInt(e.target.value),
                }))
              }
              fullWidth
            >
              <MenuItem value={0}>Select Personnel</MenuItem>
              {availablePersonnel.map((personnel) => (
                <MenuItem key={personnel.id} value={personnel.id}>
                  {personnel.name} - {personnel.email}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Post"
              value={newAssignment.post}
              onChange={(e) =>
                setNewAssignment((prev) => ({
                  ...prev,
                  post: e.target.value,
                }))
              }
              fullWidth
            >
              <MenuItem value="">Select Post</MenuItem>
              <MenuItem value="Security Guard">Security Guard</MenuItem>
              <MenuItem value="Supervisor">Supervisor</MenuItem>
              <MenuItem value="Team Leader">Team Leader</MenuItem>
              <MenuItem value="Patrol Officer">Patrol Officer</MenuItem>
            </TextField>

            <TextField
              select
              label="Role"
              value={newAssignment.role}
              onChange={(e) =>
                setNewAssignment((prev) => ({
                  ...prev,
                  role: e.target.value,
                }))
              }
              fullWidth
            >
              <MenuItem value="">Select Role</MenuItem>
              <MenuItem value="Primary">Primary</MenuItem>
              <MenuItem value="Backup">Backup</MenuItem>
              <MenuItem value="Support">Support</MenuItem>
            </TextField>

            <FormControlLabel
              control={
                <Switch
                  checked={newAssignment.isReplacement}
                  onChange={(e) =>
                    setNewAssignment((prev) => ({
                      ...prev,
                      isReplacement: e.target.checked,
                    }))
                  }
                />
              }
              label="Is Replacement"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddAssignmentModalOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAddAssignment}
            variant="contained"
            disabled={saving || !newAssignment.personnelId}
          >
            {saving ? "Adding..." : "Add Assignment"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default MissionAssignmentsPage;
