// app/attendance/page.tsx
"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek } from "date-fns";
import { AgGridReact } from "@ag-grid-community/react";
import type {
  ColDef,
  ICellEditorParams,
  NewValueParams,
  ICellRendererParams,
  RowNode,
} from "@ag-grid-community/core";
import { ClientSideRowModelModule } from "@ag-grid-community/client-side-row-model";
import "@ag-grid-community/styles/ag-grid.css";
import "@ag-grid-community/styles/ag-theme-alpine.css";
import { ModuleRegistry } from "@ag-grid-community/core";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import api from "@/lib/api";

ModuleRegistry.registerModules([ClientSideRowModelModule]);

enum AttendanceStatus {
  PRESENT = "PRESENT",
  ABSENT = "ABSENT",
  TIME_OFF = "TIME_OFF",
  JUSTIFIED_ABSENCE = "JUSTIFIED_ABSENCE",
  REPLACEMENT = "REPLACEMENT",
  EXTRA_TIME = "EXTRA_TIME",
}

const statusConfig = {
  [AttendanceStatus.PRESENT]: { letter: "P", color: "bg-green-500" },
  [AttendanceStatus.ABSENT]: { letter: "A", color: "bg-red-500" },
  [AttendanceStatus.TIME_OFF]: { letter: "T", color: "bg-yellow-500" },
  [AttendanceStatus.JUSTIFIED_ABSENCE]: { letter: "J", color: "bg-blue-500" },
  [AttendanceStatus.REPLACEMENT]: { letter: "R", color: "bg-purple-500" },
  [AttendanceStatus.EXTRA_TIME]: { letter: "E", color: "bg-orange-500" },
};

type GridRow = {
  clientName: string;
  siteName: string;
  serviceName: string;
  post: string;
  type: string;
  personnelName?: string;
  identification?: string;
  assignmentId?: number;
  contractSiteServiceId?: number;
  postIndex?: number;
  [date: string]:
    | { status: AttendanceStatus; editable: boolean }
    | string
    | number
    | undefined;
};

type PersonnelItem = {
  id: number;
  firstName: string;
  lastName: string;
  identifier: string;
};

export default function AttendancePage() {
  const revertRef = useRef(false);
  const gridRef = useRef<AgGridReact<GridRow>>(null);
  const [rowData, setRowData] = useState<GridRow[]>([]);
  const [personnelList, setPersonnelList] = useState<PersonnelItem[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date()),
  );
  const [loading, setLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState("");

  useEffect(() => {
    fetchPersonnel();
  }, []);

  useEffect(() => {
    fetchGridData();
  }, [currentWeekStart]);

  const fetchPersonnel = async () => {
    try {
      const res = await api.get("/personnel");
      setPersonnelList(res.data || []);
    } catch (err) {
      toast.error("Failed to fetch personnel");
    }
  };

  const fetchGridData = async () => {
    setLoading(true);
    const startDate = currentWeekStart;
    const endDate = endOfWeek(startDate);
    try {
      const res = await api.get(
        `/attendance/grid?startDate=${format(startDate, "yyyy-MM-dd")}&endDate=${format(endDate, "yyyy-MM-dd")}`,
      );
      setRowData(res);
      console.log("Loaded rowData sample:", res.slice(0, 3)); // Debug
    } catch (err) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

// Replace your current handleCellChange with this improved version
// Improved handleCellChange - Prevents toast spam on invalid personnel selection
const handleCellChange = async (params: NewValueParams<GridRow>) => {
  const field = params.colDef.field!;
  if (field !== "personnelName") return;

  const row = params.data;
  const newValue = params.newValue as string | undefined;
  const oldValue = params.oldValue as string | undefined;

  // Skip if this change was triggered by our own revert
  if (revertRef.current) {
    revertRef.current = false;
    return;
  }

  const personnel = personnelList.find(
    (p) => `${p.firstName} ${p.lastName}` === newValue
  );

  if (!personnel) {
    toast.error("Invalid personnel selected. Please choose from the list.");

    // Mark as reverting and revert the cell value
    revertRef.current = true;
    if (params.node) {
      params.node.setDataValue(field, oldValue ?? "");
    }
    return;
  }

  // Valid personnel selected → proceed with update
  const body: any = {
    personnelId: personnel.id,
  };

  if (row?.assignmentId) {
    body.assignmentId = row.assignmentId;
  } else {
    body.contractSiteServiceId = row?.contractSiteServiceId!;
    body.postIndex = row?.postIndex!;
  }

  try {
    await api.patch("/attendance/update", body);
    toast.success("Personnel assigned successfully");

    // Full refresh to update type ("Unassigned" → "Main") and keep grid in sync
    fetchGridData();
  } catch (err: any) {
    let errorMessage = "Invalid, personnel already assigned to another Post";

    if (err.response?.data) {
      const data = err.response.data;
      if (typeof data.message === "string") {
        errorMessage = data.message;
      } else if (Array.isArray(data.message)) {
        errorMessage = data.message.join(", ");
      } else if (data.error) {
        errorMessage = data.error;
      }
    }

    toast.error(errorMessage);

    // Revert on backend error
    revertRef.current = true;
    if (params.node) {
      params.node.setDataValue(field, oldValue ?? "");
    }
  }
};

  const handleDeleteSelected = async () => {
    const selectedNodes = gridRef.current?.api.getSelectedNodes();
    if (!selectedNodes || selectedNodes.length === 0) {
      toast.error("No rows selected");
      return;
    }

    // Filter only Replacement rows (main assignments cannot be deleted)
    const deletableNodes = selectedNodes.filter(
      (node) => node.data?.type === "Replacement",
    );

    if (deletableNodes.length === 0) {
      toast.error(
        "Only replacement assignments can be deleted. Main assignments must remain.",
      );
      return;
    }

    if (deletableNodes.length !== selectedNodes.length) {
      toast.warning(
        `${selectedNodes.length - deletableNodes.length} main assignment(s) skipped. Only replacements will be deleted.`,
      );
    }

    const assignmentIds = deletableNodes
      .map((node) => node.data?.assignmentId)
      .filter((id): id is number => !!id);

    if (assignmentIds.length === 0) {
      toast.error("No valid replacement assignments selected");
      return;
    }

    // Confirmation
    if (
      !confirm(
        `Delete ${assignmentIds.length} replacement assignment(s)? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      await Promise.all(
        assignmentIds.map((id) => api.delete(`/attendance/assignment/${id}`)),
      );
      toast.success(
        `${assignmentIds.length} replacement(s) deleted successfully`,
      );
      fetchGridData(); // Refresh grid
    } catch (err) {
      toast.error("Failed to delete one or more assignments");
    }
  };

  const columnDefs = useMemo<ColDef<GridRow>[]>(() => {
    const cols: ColDef<GridRow>[] = [
      {
        checkboxSelection: true,
        headerCheckboxSelection: true,
        width: 50,
      },
      {
        headerName: "Client",
        field: "clientName",
        flex: 1,
        filter: true,
        sortable: true,
      },
      {
        headerName: "Site",
        field: "siteName",
        flex: 1,
        filter: true,
        sortable: true,
      },
      {
        headerName: "Service",
        field: "serviceName",
        flex: 1,
        filter: true,
        sortable: true,
      },
      {
        headerName: "Post",
        field: "post",
        flex: 1,
        filter: true,
        sortable: true,
      },
      {
        headerName: "Type",
        field: "type",
        flex: 1,
        filter: true,
        sortable: true,
      },
      {
        headerName: "Personnel Name",
        field: "personnelName",
        editable: true,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: {
          values: personnelList.map((p) => `${p.firstName} ${p.lastName}`),
        },
        flex: 1,
        onCellValueChanged: handleCellChange,
      },
      {
        headerName: "Identification",
        field: "identification",
        flex: 1,
      },
    ];

    let current = new Date(currentWeekStart);
    const weekEnd = endOfWeek(currentWeekStart);
    while (current <= weekEnd) {
      const dateStr = format(current, "yyyy-MM-dd");
      const day = format(current, "EEE \nMMM dd");
      cols.push({
        headerName: day,
        field: dateStr,
        width: 120,
        headerClass: "vertical-header text-center",
        editable: (params) => {
          const value = params.data?.[dateStr];
          return (
            (typeof value === "object" &&
              value !== null &&
              "editable" in value &&
              value.editable) ??
            false
          );
        },
        cellRenderer: StatusCellRenderer,
        cellEditor: CustomStatusEditor,
        cellEditorPopup: true,
        cellEditorParams: {
          personnelList,
        },
        singleClickEdit: true, // Enable single click to start editing
      });
      current = new Date(current.setDate(current.getDate() + 1));
    }

    return cols;
  }, [currentWeekStart, personnelList]);

  const defaultColDef = useMemo(
    () => ({
      flex: 1,
      filter: true,
      sortable: true,
      resizable: true,
    }),
    [],
  );

  return (
    <div className="space-y-4 p-4">
      <style jsx global>{`
        .ag-header-row {
          height: 120px !important;
        }
        .ag-header-cell-label {
          justify-content: center !important;
          align-items: center !important;
          white-space: pre !important;
          line-height: 1.2 !important;
        }
        .vertical-header .ag-header-cell-label {
          writing-mode: vertical-lr !important;
          transform: rotate(0deg) !important;
          height: 120px !important;
        }
      `}</style>
      <h1 className="text-2xl font-bold">Attendance Agenda</h1>
      <div className="flex justify-between items-center">
        <Button
          onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
        >
          Previous Week
        </Button>
        <span>
          {format(currentWeekStart, "PPP")} -{" "}
          {format(endOfWeek(currentWeekStart), "PPP")}
        </span>
        <Button
          onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
        >
          Next Week
        </Button>
      </div>
      <div className="flex items-center space-x-2">
        <Input
          placeholder="Search..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
        />
        <Button onClick={handleDeleteSelected}>Delete Selected</Button>
      </div>
      <div className="ag-theme-alpine" style={{ height: 600, width: "100%" }}>
        <AgGridReact<GridRow>
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          animateRows={true}
          quickFilterText={globalFilter}
          loading={loading}
          headerHeight={120}
          rowSelection="multiple"
          suppressRowClickSelection={true}
          context={{ fetchGridData }}
        />
      </div>
      <div className="flex justify-between items-center mt-4">
        <Legend />
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDeleteSelected}
          className="flex items-center gap-2"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Custom Status Cell Renderer
const StatusCellRenderer = (params: ICellRendererParams<GridRow>) => {
  const value = params.value;
  if (!value || !value.status) return "";
  const config = statusConfig[value.status as AttendanceStatus];
  return (
    <Badge className={`${config.color} text-white`}>{config.letter}</Badge>
  );
};

// app/attendance/page.tsx
// ONLY replace the CustomStatusEditor component with the code below.
// Everything else in your file (including the delete button from last improvement) stays exactly the same.

const CustomStatusEditor = forwardRef(
  (
    props: ICellEditorParams<
      GridRow,
      { status: AttendanceStatus; editable: boolean }
    > & { personnelList: PersonnelItem[] },
    ref,
  ) => {
    const [status, setStatus] = useState(
      props.value?.status || AttendanceStatus.PRESENT,
    );
    const [replacementName, setReplacementName] = useState("");

    useImperativeHandle(ref, () => ({
      getValue: () => ({ status, editable: true }),
      isPopup: () => true,
    }));

    const handleSave = async () => {
      try {
        const addReplacement = !!replacementName;
        let replacementPersonnelId: number | undefined;

        if (addReplacement) {
          const personnel = props.personnelList.find(
            (p) => `${p.firstName} ${p.lastName}` === replacementName,
          );
          if (!personnel) {
            toast.error("Invalid replacement selected");
            return;
          }
          replacementPersonnelId = personnel.id;
        }

        const body: any = {
          date: props.colDef.field!,
          status,
          isAddingReplacement: addReplacement,
        };

        if (props.node.data?.assignmentId) {
          body.assignmentId = props.node.data.assignmentId;
        } else {
          body.contractSiteServiceId = props.node.data?.contractSiteServiceId!;
          body.postIndex = props.node.data?.postIndex!;
        }

        if (addReplacement && replacementPersonnelId) {
          body.personnelId = replacementPersonnelId;
          body.replacementForId = props.node.data?.assignmentId;
        }

        await api.patch("/attendance/update", body);
        toast.success("Updated successfully");

        // Always full refresh for consistency (type, status, replacements)
        if (props.context?.fetchGridData) {
          props.context.fetchGridData();
        }

        props.stopEditing(false);
      } catch (err: any) {
        let errorMessage = "Update failed";

        if (err.response?.data) {
          const data = err.response.data;
          if (typeof data.message === "string") {
            errorMessage = data.message;
          } else if (Array.isArray(data.message)) {
            errorMessage = data.message.join(", ");
          } else if (data.error) {
            errorMessage = data.error;
          }
        } else if (err.message) {
          errorMessage = err.message;
        }

        toast.error(errorMessage);
        props.stopEditing(true);
      }
    };

    return (
      <div className="flex flex-col p-2 space-y-2 min-w-[280px]">
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as AttendanceStatus)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(AttendanceStatus).map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={replacementName} onValueChange={setReplacementName}>
          <SelectTrigger>
            <SelectValue placeholder="Select Replacement (optional)" />
          </SelectTrigger>
          <SelectContent>
            {props.personnelList.map((p) => (
              <SelectItem key={p.id} value={`${p.firstName} ${p.lastName}`}>
                {p.firstName} {p.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={handleSave} className="w-full">
          Save Changes
        </Button>
      </div>
    );
  },
);

CustomStatusEditor.displayName = "CustomStatusEditor";

CustomStatusEditor.displayName = "CustomStatusEditor";

// Legend Component
const Legend = () => (
  <div className="flex flex-wrap gap-4 mt-4">
    {Object.entries(statusConfig).map(([status, { letter, color }]) => (
      <div key={status} className="flex items-center">
        <Badge className={`${color} text-white mr-2`}>{letter}</Badge>
        <span>{status.replace(/_/g, " ")}</span>
      </div>
    ))}
  </div>
);
