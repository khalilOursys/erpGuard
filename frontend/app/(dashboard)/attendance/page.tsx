"use client";

import React, { useMemo, useState } from "react";
import { MaterialReactTable } from "material-react-table";
import type {
  MRT_ColumnDef,
  MRT_Cell,
  MRT_TableInstance,
} from "material-react-table";

interface AgentData {
  id: number;
  name: string;
  [key: string]: string | number | null;
}

const AttendancePage = () => {
  const [tableData, setTableData] = useState<AgentData[]>([
    {
      id: 1,
      name: "John Doe",
      day1: "Present",
      day2: "Absent",
      day3: null,
      day4: "Leave",
      day5: "Present",
      day6: null,
      day7: "Absent",
      day8: "Present",
      day9: null,
      day10: "Leave",
      day11: "Present",
      day12: null,
      day13: "Absent",
      day14: "Present",
      day15: null,
      day16: "Leave",
      day17: "Present",
      day18: null,
      day19: "Absent",
      day20: "Present",
      day21: null,
      day22: "Leave",
      day23: "Present",
      day24: null,
      day25: "Absent",
      day26: "Present",
      day27: null,
      day28: "Leave",
      day29: "Present",
      day30: null,
      day31: "Absent",
    },
    {
      id: 2,
      name: "Jane Smith",
      day1: null,
      day2: "Leave",
      day3: "Present",
      day4: "Present",
      day5: "Absent",
      day6: null,
      day7: "Leave",
      day8: "Present",
      day9: null,
      day10: "Absent",
      day11: "Present",
      day12: "Leave",
      day13: null,
      day14: "Present",
      day15: "Absent",
      day16: null,
      day17: "Leave",
      day18: "Present",
      day19: null,
      day20: "Absent",
      day21: "Present",
      day22: null,
      day23: "Leave",
      day24: "Present",
      day25: null,
      day26: "Absent",
      day27: "Present",
      day28: null,
      day29: "Leave",
      day30: "Present",
      day31: null,
    },
    {
      id: 3,
      name: "Ahmed Ali",
      day1: "Absent",
      day2: null,
      day3: "Present",
      day4: "Leave",
      day5: null,
      day6: "Present",
      day7: "Absent",
      day8: null,
      day9: "Leave",
      day10: "Present",
      day11: null,
      day12: "Absent",
      day13: "Present",
      day14: null,
      day15: "Leave",
      day16: "Present",
      day17: null,
      day18: "Absent",
      day19: "Present",
      day20: null,
      day21: "Leave",
      day22: "Present",
      day23: null,
      day24: "Absent",
      day25: "Present",
      day26: null,
      day27: "Leave",
      day28: "Present",
      day29: null,
      day30: "Absent",
      day31: "Present",
    },
  ]);

  // Get color based on status
  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "Present":
        return { backgroundColor: "#d1fae5", color: "#065f46" }; // green
      case "Absent":
        return { backgroundColor: "#fee2e2", color: "#991b1b" }; // red
      case "Leave":
        return { backgroundColor: "#fef3c7", color: "#92400e" }; // yellow/amber
      default:
        return { backgroundColor: "#f9fafb", color: "#6b7280" }; // gray
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
    table: any;
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
        style={{
          width: "100%",
          textAlign: "center",
          border: "none",
          outline: "none",
          background: "transparent",
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
      ...Array.from({ length: 31 }, (_, i) => {
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
    []
  );

  const handleSaveCell = (cell: MRT_Cell<AgentData>, value: any) => {
    const rowIndex = tableData.findIndex(
      (row) => row.id === cell.row.original.id
    );
    if (rowIndex === -1) return;

    setTableData((prev) =>
      prev.map((row, index) =>
        index === rowIndex ? { ...row, [cell.column.id]: value || null } : row
      )
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen attendance">
      <h2 className="text-2xl font-bold mb-6 text-gray-700">
        Agent Attendance – October
      </h2>
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
