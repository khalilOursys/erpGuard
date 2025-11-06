// app/attendance/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback, useRef, forwardRef, useImperativeHandle } from "react";
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek } from "date-fns";
import { AgGridReact } from "@ag-grid-community/react";
import type { ColDef, ICellEditorParams, NewValueParams, ICellRendererParams } from "@ag-grid-community/core";
import { ClientSideRowModelModule } from "@ag-grid-community/client-side-row-model";
import "@ag-grid-community/styles/ag-grid.css";
import "@ag-grid-community/styles/ag-theme-alpine.css";
import { ModuleRegistry } from "@ag-grid-community/core";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
  [AttendanceStatus.PRESENT]: { letter: 'P', color: 'bg-green-500' },
  [AttendanceStatus.ABSENT]: { letter: 'A', color: 'bg-red-500' },
  [AttendanceStatus.TIME_OFF]: { letter: 'T', color: 'bg-yellow-500' },
  [AttendanceStatus.JUSTIFIED_ABSENCE]: { letter: 'J', color: 'bg-blue-500' },
  [AttendanceStatus.REPLACEMENT]: { letter: 'R', color: 'bg-purple-500' },
  [AttendanceStatus.EXTRA_TIME]: { letter: 'E', color: 'bg-orange-500' },
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
  [date: string]: { status: AttendanceStatus; editable: boolean } | string | number | undefined;
};

type PersonnelItem = {
  id: number;
  firstName: string;
  lastName: string;
  identifier: string;
};

export default function AttendancePage() {
  const gridRef = useRef<AgGridReact<GridRow>>(null);
  const [rowData, setRowData] = useState<GridRow[]>([]);
  const [personnelList, setPersonnelList] = useState<PersonnelItem[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date()));
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
      const res = await api.get(`/attendance/grid?startDate=${format(startDate, "yyyy-MM-dd")}&endDate=${format(endDate, "yyyy-MM-dd")}`);
      setRowData(res);
      console.log('Loaded rowData sample:', res.slice(0, 3)); // Debug
    } catch (err) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleCellChange = async (params: NewValueParams<GridRow>) => {
    const field = params.colDef.field!;
    const row = params.data;

    if (field === "personnelName") {
      const personnel = personnelList.find((p) => `${p.firstName} ${p.lastName}` === params.newValue);
      if (!personnel) {
        toast.error("Invalid personnel selected");
        params.api.undoLastCellEdit();
        return;
      }

      const body: any = {
        personnelId: personnel.id,
      };
      if (row.assignmentId) {
        body.assignmentId = row.assignmentId;
      } else {
        body.contractSiteServiceId = row.contractSiteServiceId!;
        body.postIndex = row.postIndex!;
      }

      try {
        await api.patch("/attendance/update", body);
        toast.success("Personnel updated successfully");
        row.identification = personnel.identifier;
        params.api.applyTransaction({ update: [row] });
      } catch (err) {
        toast.error(err?.response?.data?.message || "Update failed");
        params.api.undoLastCellEdit();
      }
    }
  };

  const handleDeleteSelected = async () => {
    const selectedNodes = gridRef.current?.api.getSelectedNodes();
    if (!selectedNodes || selectedNodes.length === 0) {
      toast.error("No rows selected");
      return;
    }

    const assignmentIds = selectedNodes
      .map((node) => node.data.assignmentId)
      .filter((id): id is number => !!id);

    if (assignmentIds.length === 0) {
      toast.error("No deletable assignments selected");
      return;
    }

    try {
      await Promise.all(
        assignmentIds.map((id) => api.delete(`/attendance/assignment/${id}`))
      );
      toast.success("Selected assignments deleted successfully");
      fetchGridData();
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  const columnDefs = useMemo<ColDef<GridRow>[]>(() => {
    const cols: ColDef<GridRow>[] = [
      {
        checkboxSelection: true,
        headerCheckboxSelection: true,
        width: 50,
      },
      { headerName: "Client", field: "clientName", flex: 1, filter: true, sortable: true },
      { headerName: "Site", field: "siteName", flex: 1, filter: true, sortable: true },
      { headerName: "Service", field: "serviceName", flex: 1, filter: true, sortable: true },
      { headerName: "Post", field: "post", flex: 1, filter: true, sortable: true },
      { headerName: "Type", field: "type", flex: 1, filter: true, sortable: true },
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
        headerClass: 'vertical-header text-center',
        editable: (params) => params.data[dateStr]?.editable ?? false,
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

  const defaultColDef = useMemo(() => ({
    flex: 1,
    filter: true,
    sortable: true,
    resizable: true,
  }), []);

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
        <Button onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}>Previous Week</Button>
        <span>{format(currentWeekStart, "PPP")} - {format(endOfWeek(currentWeekStart), "PPP")}</span>
        <Button onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}>Next Week</Button>
      </div>
      <div className="flex items-center space-x-2">
        <Input placeholder="Search..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} />
        <Button onClick={handleDeleteSelected}>Delete Selected</Button>
      </div>
      <div className="ag-theme-alpine" style={{ height: 600, width: '100%' }}>
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
      <Legend />
    </div>
  );
}

// Custom Status Cell Renderer
const StatusCellRenderer = (params: ICellRendererParams<GridRow>) => {
  const value = params.value;
  if (!value || !value.status) return '';
  const config = statusConfig[value.status as AttendanceStatus];
  return <Badge className={`${config.color} text-white`}>{config.letter}</Badge>;
};

// Custom Status Editor
const CustomStatusEditor = forwardRef((props: ICellEditorParams<GridRow, { status: AttendanceStatus; editable: boolean }> & { personnelList: PersonnelItem[] }, ref) => {
  const [status, setStatus] = useState(props.value?.status || AttendanceStatus.PRESENT);
  const [showReplacement, setShowReplacement] = useState(status === AttendanceStatus.ABSENT);
  const [replacementName, setReplacementName] = useState("");

  useImperativeHandle(ref, () => ({
    getValue: () => props.value, // Always return original value; update happens manually after API call
    isPopup: () => true,
  }));

  useEffect(() => {
    setShowReplacement(status === AttendanceStatus.ABSENT);
  }, [status]);

  const handleSave = async () => {
    try {
      const addReplacement = (status === AttendanceStatus.ABSENT) && !!replacementName;
      let replacementPersonnelId: number | undefined;
      if (addReplacement) {
        const personnel = props.personnelList.find((p) => `${p.firstName} ${p.lastName}` === replacementName);
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

      if (props.node.data!.assignmentId) {
        body.assignmentId = props.node.data!.assignmentId;
      } else {
        body.contractSiteServiceId = props.node.data!.contractSiteServiceId!;
        body.postIndex = props.node.data!.postIndex!;
      }

      if (addReplacement) {
        body.personnelId = replacementPersonnelId;
        body.replacementForId = props.node.data!.assignmentId;
      }

      await api.patch("/attendance/update", body);
      toast.success("Updated successfully");

      if (addReplacement) {
        // Reload grid since a new replacement row might be added or updated
        props.context.fetchGridData();
      } else {
        // Update the cell locally
        props.node.setDataValue(props.colDef.field!, { status, editable: true });
      }

      props.stopEditing(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Update failed");
      props.stopEditing(true); // Cancel editing
    }
  };

  return (
    <div className="flex flex-col p-2 space-y-2">
      <Select value={status} onValueChange={(value) => setStatus(value as AttendanceStatus)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.values(AttendanceStatus).map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showReplacement && (
        <Select value={replacementName} onValueChange={setReplacementName}>
          <SelectTrigger>
            <SelectValue placeholder="Select Replacement" />
          </SelectTrigger>
          <SelectContent>
            {props.personnelList.map((p) => (
              <SelectItem key={p.id} value={`${p.firstName} ${p.lastName}`}>
                {p.firstName} {p.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Button onClick={handleSave}>Save</Button>
    </div>
  );
});
CustomStatusEditor.displayName = "CustomStatusEditor";

// Legend Component
const Legend = () => (
  <div className="flex flex-wrap gap-4 mt-4">
    {Object.entries(statusConfig).map(([status, { letter, color }]) => (
      <div key={status} className="flex items-center">
        <Badge className={`${color} text-white mr-2`}>{letter}</Badge>
        <span>{status.replace(/_/g, ' ')}</span>
      </div>
    ))}
  </div>
);