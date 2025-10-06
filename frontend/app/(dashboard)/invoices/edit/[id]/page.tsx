// components/invoices/UpdateInvoice.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

// Types (same as before)
interface Client {
  id: number;
  name: string;
  type: string;
  address?: string;
  tax_number?: string;
  rib?: string;
  companyId: number;
}

interface ClientContract {
  id: number;
  contractNumber: string;
  clientId: number;
  client: Client;
  startDate: string;
  endDate: string;
  status: "DRAFT" | "ACTIVE" | "EXPIRED";
  companyId: number;
}

interface Service {
  id: number;
  name: string;
  description?: string;
  unitPrice: number;
  currency: string;
  companyId: number;
}

interface MissionServiceRequirement {
  id: number;
  missionId: number;
  serviceId: number;
  service: Service;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

interface Mission {
  id: number;
  contractId: number;
  siteId?: number;
  startDate: string;
  endDate: string;
  requiredPersonnel: number;
  contract: ClientContract;
  requirements?: MissionServiceRequirement[];
}

interface BillingLine {
  id: number;
  billingId?: number;
  lineType: "MISSION" | "SERVICE" | "CUSTOM";
  description: string;
  missionId?: number;
  mission?: Mission;
  assignmentId?: number;
  missionServiceId?: number;
  personnelId?: number;
  serviceId?: number;
  contractId?: number;
  personnelCount: number;
  quantity: number;
  unitPriceBase: number;
  lineTotalBase: number;
  discountPercent?: number;
  discountAmountBase?: number;
  totalAfterDiscountBase: number;
  taxPercent?: number;
  taxAmountBase?: number;
  missionServiceRequirementId?: number;
  missionServiceRequirement?: MissionServiceRequirement;
}

// Column configuration interface
interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
}

interface CreateBillingData {
  clientId: number;
  status?: string;
  companyId?: number;
  contractId?: number;
  periodStart: string;
  periodEnd: string;
  invoiceDate: string;
  dueDate?: string;
  targetCurrency?: string;
  conversionRate?: number;
  notes?: string;
  lines: Omit<BillingLine, "id" | "billingId">[];
  columnConfigs?: ColumnConfig[];
}

interface UpdateBillingData extends CreateBillingData {
  id: number;
  lines: BillingLine[];
}

interface Billing extends CreateBillingData {
  id: number;
  invoiceNumber: string;
  status: string;
  lines: BillingLine[];
  columnConfigs?: ColumnConfig[];
}

// Updated API functions
const invoiceApi = {
  getInvoice: async (id: number, token: string | null): Promise<Billing> => {
    if (!token) throw new Error("Authentication required");

    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    if (!API_URL) throw new Error("API URL not configured");

    const response = await fetch(`${API_URL}/billings/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(
        `Failed to fetch invoice: ${response.status} ${errorData}`
      );
    }

    return response.json();
  },

  updateInvoice: async (
    id: number,
    data: UpdateBillingData,
    token: string | null
  ) => {
    if (!token) throw new Error("Authentication required");

    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    if (!API_URL) throw new Error("API URL not configured");

    const response = await fetch(`${API_URL}/billings/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(
        `Failed to update invoice: ${response.status} ${errorData}`
      );
    }

    return response.json();
  },

  getClients: async (
    companyId: number,
    token: string | null
  ): Promise<Client[]> => {
    if (!token) throw new Error("Authentication required");

    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    if (!API_URL) throw new Error("API URL not configured");

    const response = await fetch(`${API_URL}/clients?companyId=${companyId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error("Failed to fetch clients");
    var res = await response.json();
    return res.data;
  },

  getClientContracts: async (
    clientId: number,
    token: string | null
  ): Promise<ClientContract[]> => {
    if (!token) throw new Error("Authentication required");

    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    if (!API_URL) throw new Error("API URL not configured");

    const response = await fetch(
      `${API_URL}/contracts/getContractByIdClient/${clientId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) throw new Error("Failed to fetch contracts");
    return response.json();
  },

  getMissionsForBilling: async (
    contractId: number,
    token: string | null
  ): Promise<Mission[]> => {
    if (!token) throw new Error("Authentication required");

    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    if (!API_URL) throw new Error("API URL not configured");

    const response = await fetch(
      `${API_URL}/missions/getContractByIdClient/${contractId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) throw new Error("Failed to fetch missions");
    return response.json();
  },
};

export default function UpdateInvoice() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const invoiceId = parseInt(params.id as string);

  const [companyId, setCompanyId] = useState<number>(0);
  const [token, setToken] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [contracts, setContracts] = useState<ClientContract[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [addedMissionIds, setAddedMissionIds] = useState<number[]>([]);

  const [formData, setFormData] = useState({
    clientId: 0,
    contractId: 0,
    periodStart: "",
    periodEnd: "",
    invoiceDate: format(new Date(), "yyyy-MM-dd"),
    dueDate: "",
    notes: "",
    companyId: 0,
  });

  const [lines, setLines] = useState<BillingLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Column configuration state
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: "type", label: "Type", visible: true },
    { key: "description", label: "Description", visible: true },
    { key: "quantity", label: "Qty", visible: true },
    { key: "unitPrice", label: "Unit Price", visible: true },
    { key: "personnel", label: "Personnel", visible: false },
    { key: "discount", label: "Discount %", visible: false },
    { key: "tax", label: "Tax %", visible: false },
    { key: "total", label: "Total", visible: true },
  ]);

  // Fetch invoice data
  const { data: invoice, isLoading: isLoadingInvoice } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => invoiceApi.getInvoice(invoiceId, token),
    enabled: !!invoiceId && !!token,
  });

  // Initialize auth data and set form data when invoice loads
  useEffect(() => {
    const userData = localStorage.getItem("user");
    const authToken = localStorage.getItem("token");

    if (userData) {
      try {
        const user = JSON.parse(userData);
        setCompanyId(user.companyId || 0);
      } catch (error) {
        console.error("Error parsing user data:", error);
        showAlert("Error loading user data", "error");
      }
    }

    setToken(authToken);
  }, []);

  // Set form data when invoice is loaded
  useEffect(() => {
    if (invoice) {
      setFormData({
        clientId: invoice.clientId,
        contractId: invoice.contractId || 0,
        periodStart: invoice.periodStart
          ? format(new Date(invoice.periodStart), "yyyy-MM-dd")
          : "",
        periodEnd: invoice.periodEnd
          ? format(new Date(invoice.periodEnd), "yyyy-MM-dd")
          : "",
        invoiceDate: invoice.invoiceDate
          ? format(new Date(invoice.invoiceDate), "yyyy-MM-dd")
          : format(new Date(), "yyyy-MM-dd"),
        dueDate: invoice.dueDate
          ? format(new Date(invoice.dueDate), "yyyy-MM-dd")
          : "",
        notes: invoice.notes || "",
        companyId: invoice.companyId || 0,
      });

      setLines(invoice.lines || []);

      // Set column configuration from invoice if available, otherwise use default
      if (invoice.columnConfigs && invoice.columnConfigs.length > 0) {
        setColumns(invoice.columnConfigs);
      }

      // Set added mission IDs from existing lines
      const missionIds = [
        ...new Set(
          invoice.lines?.map((line) => line.missionId).filter(Boolean)
        ),
      ] as number[];
      setAddedMissionIds(missionIds);
    }
  }, [invoice]);

  // React Query Mutation for updating invoice
  const updateInvoiceMutation = useMutation({
    mutationFn: (data: UpdateBillingData) =>
      invoiceApi.updateInvoice(invoiceId, data, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      showAlert("Invoice updated successfully!", "success");
      setTimeout(() => router.push("/invoices"), 1500);
    },
    onError: (error: Error) => {
      showAlert(error.message || "Failed to update invoice", "error");
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  // Fetch clients on component mount
  useEffect(() => {
    const fetchClients = async () => {
      if (!companyId || !token) return;

      try {
        const clientsData = await invoiceApi.getClients(companyId, token);
        setClients(clientsData);
      } catch (error) {
        console.error("Error fetching clients:", error);
        showAlert("Failed to load clients", "error");
      }
    };

    fetchClients();
  }, [companyId, token]);

  // Fetch contracts when client changes
  useEffect(() => {
    const fetchContracts = async () => {
      if (formData.clientId <= 0 || !token) return;

      try {
        const contractsData = await invoiceApi.getClientContracts(
          formData.clientId,
          token
        );
        setContracts(contractsData);
      } catch (error) {
        console.error("Error fetching contracts:", error);
        setContracts([]);
      }
    };

    fetchContracts();
  }, [formData.clientId, token]);

  // Fetch missions when contract changes
  useEffect(() => {
    const fetchMissions = async () => {
      if (formData.contractId <= 0) return;

      try {
        const missionsData = await invoiceApi.getMissionsForBilling(
          formData.contractId,
          token
        );
        setMissions(missionsData);
      } catch (error) {
        console.error("Error fetching missions:", error);
        setMissions([]);
      }
    };

    fetchMissions();
  }, [formData.contractId, token]);

  const showAlert = useCallback(
    (message: string, type: "success" | "error") => {
      setAlert({ message, type });
      setTimeout(() => setAlert(null), 3000);
    },
    []
  );

  // Toggle column visibility
  const toggleColumn = useCallback((columnKey: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.key === columnKey ? { ...col, visible: !col.visible } : col
      )
    );
  }, []);

  // Add mission with all services
  const addMissionWithServices = useCallback(
    (mission: Mission) => {
      const newLines: BillingLine[] = [];

      // Add mission personnel line
      const missionLine: BillingLine = {
        id: Date.now(), // Temporary ID for new lines
        billingId: invoiceId,
        lineType: "MISSION",
        description: `Mission ${mission.id} - Personnel`,
        missionId: mission.id,
        personnelCount: mission.requiredPersonnel,
        quantity: 1,
        unitPriceBase: 100, // Default price - should come from contract
        lineTotalBase: mission.requiredPersonnel * 100,
        discountPercent: 0,
        discountAmountBase: 0,
        totalAfterDiscountBase: mission.requiredPersonnel * 100,
        taxPercent: 0,
        taxAmountBase: 0,
        mission,
      };
      newLines.push(missionLine);

      // Add all service lines for this mission
      if (mission.requirements) {
        mission.requirements.forEach((serviceReq, index) => {
          const serviceLine: BillingLine = {
            id: Date.now() + serviceReq.id + index, // Ensure unique ID
            billingId: invoiceId,
            lineType: "SERVICE",
            description: `Mission ${mission.id} - ${serviceReq.service.name}`,
            missionId: mission.id,
            missionServiceRequirementId: serviceReq.id,
            missionServiceRequirement: serviceReq,
            serviceId: serviceReq.serviceId,
            personnelCount: 1,
            quantity: serviceReq.quantity,
            unitPriceBase: serviceReq.unitPrice,
            lineTotalBase: serviceReq.totalPrice,
            discountPercent: 0,
            discountAmountBase: 0,
            totalAfterDiscountBase: serviceReq.totalPrice,
            taxPercent: 0,
            taxAmountBase: 0,
          };
          newLines.push(serviceLine);
        });
      }

      setLines((prev) => [...prev, ...newLines]);
      setAddedMissionIds((prev) => [...prev, mission.id]);
    },
    [invoiceId]
  );

  // Remove mission and all its services
  const removeMissionWithServices = useCallback((missionId: number) => {
    setLines((prev) => prev.filter((line) => line.missionId !== missionId));
    setAddedMissionIds((prev) => prev.filter((id) => id !== missionId));
  }, []);

  const addCustomLine = useCallback(() => {
    const newLine: BillingLine = {
      id: Date.now(), // Temporary ID for new lines
      billingId: invoiceId,
      lineType: "CUSTOM",
      description: "Custom service",
      personnelCount: 1,
      quantity: 1,
      unitPriceBase: 0,
      lineTotalBase: 0,
      discountPercent: 0,
      discountAmountBase: 0,
      totalAfterDiscountBase: 0,
      taxPercent: 0,
      taxAmountBase: 0,
    };
    setLines((prev) => [...prev, newLine]);
  }, [invoiceId]);

  const updateLine = useCallback(
    (index: number, updates: Partial<BillingLine>) => {
      setLines((prev) => {
        const newLines = [...prev];
        const line = { ...newLines[index], ...updates };

        // Recalculate totals with proper decimal handling
        line.lineTotalBase = parseFloat(
          (line.quantity * line.unitPriceBase * line.personnelCount).toFixed(2)
        );

        line.discountAmountBase = line.discountPercent
          ? parseFloat(
              (line.lineTotalBase * (line.discountPercent / 100)).toFixed(2)
            )
          : 0;

        line.totalAfterDiscountBase = parseFloat(
          (line.lineTotalBase - (line.discountAmountBase || 0)).toFixed(2)
        );

        line.taxAmountBase = line.taxPercent
          ? parseFloat(
              (line.totalAfterDiscountBase * (line.taxPercent / 100)).toFixed(2)
            )
          : 0;

        newLines[index] = line;
        return newLines;
      });
    },
    []
  );

  const removeLine = useCallback((index: number) => {
    setLines((prev) => {
      const lineToRemove = prev[index];
      const newLines = prev.filter((_, i) => i !== index);

      // Check if this was the last line for a mission
      if (lineToRemove.missionId) {
        const missionLinesCount = newLines.filter(
          (line) => line.missionId === lineToRemove.missionId
        ).length;
        if (missionLinesCount === 0) {
          setAddedMissionIds((prev) =>
            prev.filter((id) => id !== lineToRemove.missionId)
          );
        }
      }

      return newLines;
    });
  }, []);

  const calculateTotals = useCallback(() => {
    const subtotal = parseFloat(
      lines
        .reduce((sum, line) => {
          const lineTotal = Number(line.totalAfterDiscountBase) || 0;
          return sum + lineTotal;
        }, 0)
        .toFixed(2)
    );

    const taxTotal = parseFloat(
      lines
        .reduce((sum, line) => {
          const taxAmount = Number(line.taxAmountBase) || 0;
          return sum + taxAmount;
        }, 0)
        .toFixed(2)
    );

    const total = parseFloat((subtotal + taxTotal).toFixed(2));
    return { subtotal, taxTotal, total };
  }, [lines]);

  const handleSubmit = async (status: "DRAFT" | "PENDING") => {
    // Validation
    if (formData.clientId === 0) {
      showAlert("Please select a client", "error");
      return;
    }

    if (!formData.periodStart || !formData.periodEnd) {
      showAlert("Please select billing period", "error");
      return;
    }

    if (new Date(formData.periodStart) > new Date(formData.periodEnd)) {
      showAlert("Period start must be before period end", "error");
      return;
    }

    if (lines.length === 0) {
      showAlert("Please add at least one invoice line", "error");
      return;
    }

    // Validate individual lines
    for (const line of lines) {
      if (!line.description.trim()) {
        showAlert("All lines must have a description", "error");
        return;
      }
      if (line.quantity <= 0) {
        showAlert("All lines must have a quantity greater than 0", "error");
        return;
      }
      if (line.unitPriceBase < 0) {
        showAlert("Unit price cannot be negative", "error");
        return;
      }
    }

    setIsLoading(true);

    const invoiceData: UpdateBillingData = {
      id: invoiceId,
      status: status,
      companyId: companyId,
      clientId: formData.clientId,
      contractId: formData.contractId > 0 ? formData.contractId : undefined,
      periodStart: formData.periodStart,
      periodEnd: formData.periodEnd,
      invoiceDate: formData.invoiceDate,
      dueDate: formData.dueDate || undefined,
      notes: formData.notes || undefined,
      lines: lines.map((line) => ({
        id: line.id,
        lineType: line.lineType,
        description: line.description,
        missionId: line.missionId,
        assignmentId: line.assignmentId,
        missionServiceId: line.missionServiceId,
        missionServiceRequirementId: line.missionServiceRequirementId,
        personnelId: line.personnelId,
        serviceId: line.serviceId,
        contractId: line.contractId,
        personnelCount: Number(line.personnelCount) || 1,
        quantity: Number(line.quantity) || 1,
        unitPriceBase: Number(line.unitPriceBase) || 0,
        lineTotalBase: Number(line.lineTotalBase) || 0,
        discountPercent: line.discountPercent
          ? Number(line.discountPercent)
          : 0,
        discountAmountBase: line.discountAmountBase
          ? Number(line.discountAmountBase)
          : 0,
        totalAfterDiscountBase: Number(line.totalAfterDiscountBase) || 0,
        taxPercent: line.taxPercent ? Number(line.taxPercent) : 0,
        taxAmountBase: line.taxAmountBase ? Number(line.taxAmountBase) : 0,
      })),
      // Include column configuration in the billing data
      columnConfigs: columns.map((col, index) => ({
        key: col.key,
        label: col.label,
        visible: col.visible,
        order: index,
      })),
    };

    updateInvoiceMutation.mutate(invoiceData);
  };

  const { subtotal, taxTotal, total } = calculateTotals();

  // Group lines by mission for better display
  const groupedLines = lines.reduce((acc, line) => {
    if (line.missionId) {
      if (!acc[line.missionId]) {
        acc[line.missionId] = [];
      }
      acc[line.missionId].push(line);
    } else {
      if (!acc.custom) {
        acc.custom = [];
      }
      acc.custom.push(line);
    }
    return acc;
  }, {} as { [key: string]: BillingLine[] });

  if (isLoadingInvoice) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading invoice...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {alert && (
        <Alert
          className={
            alert.type === "success"
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }
        >
          <AlertDescription
            className={
              alert.type === "success" ? "text-green-800" : "text-red-800"
            }
          >
            {alert.message}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Update Invoice {invoice?.invoiceNumber}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Client and Contract Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client" className="required">
                Client*
              </Label>
              <Select
                value={formData.clientId.toString()}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    clientId: parseInt(value),
                    contractId: 0,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contract">Contract</Label>
              <Select
                value={formData.contractId.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, contractId: parseInt(value) })
                }
                disabled={contracts.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      contracts.length === 0
                        ? "No contracts available"
                        : "Select contract"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {contracts.map((contract) => (
                    <SelectItem
                      key={contract.id}
                      value={contract.id.toString()}
                    >
                      {contract.contractNumber} ({contract.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="periodStart" className="required">
                Period Start*
              </Label>
              <Input
                type="date"
                value={formData.periodStart}
                onChange={(e) =>
                  setFormData({ ...formData, periodStart: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodEnd" className="required">
                Period End*
              </Label>
              <Input
                type="date"
                value={formData.periodEnd}
                onChange={(e) =>
                  setFormData({ ...formData, periodEnd: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) =>
                  setFormData({ ...formData, dueDate: e.target.value })
                }
              />
            </div>
          </div>

          {/* Available Missions in Table Format */}
          {missions.length > 0 && (
            <div className="space-y-4">
              <Label>Available Missions for Selected Period</Label>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mission ID</TableHead>
                      <TableHead>Contract</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Personnel</TableHead>
                      <TableHead>Services</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {missions.map((mission) => {
                      const isAdded = addedMissionIds.includes(mission.id);
                      const serviceCount = mission.requirements?.length || 0;

                      return (
                        <TableRow key={mission.id}>
                          <TableCell className="font-medium">
                            Mission {mission.id}
                          </TableCell>
                          <TableCell>
                            {mission.contract.contractNumber}
                          </TableCell>
                          <TableCell>
                            {format(
                              new Date(mission.startDate),
                              "MMM dd, yyyy"
                            )}{" "}
                            -{" "}
                            {format(new Date(mission.endDate), "MMM dd, yyyy")}
                          </TableCell>
                          <TableCell>{mission.requiredPersonnel}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div>{serviceCount} services</div>
                              {mission.requirements && (
                                <div className="text-xs text-gray-500">
                                  {mission.requirements
                                    .map((sr) => sr.service.name)
                                    .join(", ")}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {isAdded ? (
                              <Badge
                                variant="default"
                                className="bg-green-100 text-green-800"
                              >
                                Added ({1 + serviceCount} lines)
                              </Badge>
                            ) : (
                              <Badge variant="outline">Not Added</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {isAdded ? (
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  removeMissionWithServices(mission.id)
                                }
                              >
                                Remove Mission
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="default"
                                size="sm"
                                onClick={() => addMissionWithServices(mission)}
                              >
                                Add Mission ({1 + serviceCount} lines)
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Invoice Lines Table */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Invoice Lines ({lines.length} total lines)</Label>
              <div className="flex items-center gap-4">
                {/* Column Selector */}
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Columns:</Label>
                  <div className="flex gap-2">
                    {columns.map((column) => (
                      <div key={column.key} className="flex items-center gap-1">
                        <Checkbox
                          id={`column-${column.key}`}
                          checked={column.visible}
                          onChange={() => toggleColumn(column.key)}
                        />
                        <Label
                          htmlFor={`column-${column.key}`}
                          className="text-sm"
                        >
                          {column.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomLine}
                >
                  + Add Custom Line
                </Button>
              </div>
            </div>

            {lines.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                No lines added. Add missions or custom lines.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Grouped by Mission */}
                {Object.entries(groupedLines).map(
                  ([missionId, missionLines]) => {
                    if (missionId === "custom") {
                      return (
                        <div key="custom">
                          <h4 className="font-semibold mb-2">Custom Lines</h4>
                          <div className="border rounded-lg">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  {columns.find((col) => col.key === "type")
                                    ?.visible && <TableHead>Type</TableHead>}
                                  {columns.find(
                                    (col) => col.key === "description"
                                  )?.visible && (
                                    <TableHead>Description</TableHead>
                                  )}
                                  {columns.find((col) => col.key === "quantity")
                                    ?.visible && <TableHead>Qty</TableHead>}
                                  {columns.find(
                                    (col) => col.key === "unitPrice"
                                  )?.visible && (
                                    <TableHead>Unit Price</TableHead>
                                  )}
                                  {columns.find(
                                    (col) => col.key === "personnel"
                                  )?.visible && (
                                    <TableHead>Personnel</TableHead>
                                  )}
                                  {columns.find((col) => col.key === "discount")
                                    ?.visible && (
                                    <TableHead>Discount %</TableHead>
                                  )}
                                  {columns.find((col) => col.key === "tax")
                                    ?.visible && <TableHead>Tax %</TableHead>}
                                  {columns.find((col) => col.key === "total")
                                    ?.visible && <TableHead>Total</TableHead>}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {missionLines.map((line, index) => {
                                  const globalIndex = lines.findIndex(
                                    (l) => l.id === line.id
                                  );
                                  return (
                                    <TableRow key={line.id}>
                                      {columns.find((col) => col.key === "type")
                                        ?.visible && (
                                        <TableCell>
                                          <Badge
                                            variant={
                                              line.lineType === "MISSION"
                                                ? "default"
                                                : "secondary"
                                            }
                                          >
                                            {line.lineType}
                                          </Badge>
                                        </TableCell>
                                      )}
                                      {columns.find(
                                        (col) => col.key === "description"
                                      )?.visible && (
                                        <TableCell>
                                          <Input
                                            value={line.description}
                                            onChange={(e) =>
                                              updateLine(globalIndex, {
                                                description: e.target.value,
                                              })
                                            }
                                            className="border-0 focus-visible:ring-1"
                                            required
                                          />
                                        </TableCell>
                                      )}
                                      {columns.find(
                                        (col) => col.key === "quantity"
                                      )?.visible && (
                                        <TableCell>
                                          <Input
                                            type="number"
                                            min="1"
                                            value={line.quantity}
                                            onChange={(e) =>
                                              updateLine(globalIndex, {
                                                quantity:
                                                  parseInt(e.target.value) || 1,
                                              })
                                            }
                                            className="w-20 border-0 focus-visible:ring-1"
                                            required
                                          />
                                        </TableCell>
                                      )}
                                      {columns.find(
                                        (col) => col.key === "unitPrice"
                                      )?.visible && (
                                        <TableCell>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={line.unitPriceBase}
                                            onChange={(e) =>
                                              updateLine(globalIndex, {
                                                unitPriceBase:
                                                  parseFloat(e.target.value) ||
                                                  0,
                                              })
                                            }
                                            className="w-24 border-0 focus-visible:ring-1"
                                            required
                                          />
                                        </TableCell>
                                      )}
                                      {columns.find(
                                        (col) => col.key === "personnel"
                                      )?.visible && (
                                        <TableCell>
                                          <Input
                                            type="number"
                                            min="1"
                                            value={line.personnelCount}
                                            onChange={(e) =>
                                              updateLine(globalIndex, {
                                                personnelCount:
                                                  parseInt(e.target.value) || 1,
                                              })
                                            }
                                            className="w-20 border-0 focus-visible:ring-1"
                                            required
                                          />
                                        </TableCell>
                                      )}
                                      {columns.find(
                                        (col) => col.key === "discount"
                                      )?.visible && (
                                        <TableCell>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            value={line.discountPercent || ""}
                                            onChange={(e) =>
                                              updateLine(globalIndex, {
                                                discountPercent:
                                                  parseFloat(e.target.value) ||
                                                  0,
                                              })
                                            }
                                            className="w-20 border-0 focus-visible:ring-1"
                                          />
                                        </TableCell>
                                      )}
                                      {columns.find((col) => col.key === "tax")
                                        ?.visible && (
                                        <TableCell>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={line.taxPercent || ""}
                                            onChange={(e) =>
                                              updateLine(globalIndex, {
                                                taxPercent:
                                                  parseFloat(e.target.value) ||
                                                  0,
                                              })
                                            }
                                            className="w-20 border-0 focus-visible:ring-1"
                                          />
                                        </TableCell>
                                      )}
                                      {columns.find(
                                        (col) => col.key === "total"
                                      )?.visible && (
                                        <TableCell className="font-medium">
                                          $
                                          {line.totalAfterDiscountBase.toFixed(
                                            2
                                          )}
                                        </TableCell>
                                      )}
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      );
                    }
                    const mission = missions.find(
                      (m) => m.id === parseInt(missionId)
                    );
                    return (
                      <div key={missionId}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">
                            Mission {missionId} - {missionLines.length} lines
                            {mission && (
                              <span className="text-sm font-normal text-gray-600 ml-2">
                                ({mission.requiredPersonnel} personnel +{" "}
                                {missionLines.length - 1} services)
                              </span>
                            )}
                          </h4>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              removeMissionWithServices(parseInt(missionId))
                            }
                          >
                            Remove Entire Mission
                          </Button>
                        </div>
                        <div className="border rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {columns.find((col) => col.key === "type")
                                  ?.visible && <TableHead>Type</TableHead>}
                                {columns.find(
                                  (col) => col.key === "description"
                                )?.visible && (
                                  <TableHead>Description</TableHead>
                                )}
                                {columns.find((col) => col.key === "quantity")
                                  ?.visible && <TableHead>Qty</TableHead>}
                                {columns.find((col) => col.key === "unitPrice")
                                  ?.visible && (
                                  <TableHead>Unit Price</TableHead>
                                )}
                                {columns.find((col) => col.key === "personnel")
                                  ?.visible && <TableHead>Personnel</TableHead>}
                                {columns.find((col) => col.key === "discount")
                                  ?.visible && (
                                  <TableHead>Discount %</TableHead>
                                )}
                                {columns.find((col) => col.key === "tax")
                                  ?.visible && <TableHead>Tax %</TableHead>}
                                {columns.find((col) => col.key === "total")
                                  ?.visible && <TableHead>Total</TableHead>}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {missionLines.map((line, index) => {
                                const globalIndex = lines.findIndex(
                                  (l) => l.id === line.id
                                );
                                return (
                                  <TableRow key={line.id}>
                                    {columns.find((col) => col.key === "type")
                                      ?.visible && (
                                      <TableCell>
                                        <Badge
                                          variant={
                                            line.lineType === "MISSION"
                                              ? "default"
                                              : "secondary"
                                          }
                                        >
                                          {line.lineType}
                                        </Badge>
                                      </TableCell>
                                    )}
                                    {columns.find(
                                      (col) => col.key === "description"
                                    )?.visible && (
                                      <TableCell>
                                        <Input
                                          value={line.description}
                                          onChange={(e) =>
                                            updateLine(globalIndex, {
                                              description: e.target.value,
                                            })
                                          }
                                          className="border-0 focus-visible:ring-1"
                                          required
                                        />
                                      </TableCell>
                                    )}
                                    {columns.find(
                                      (col) => col.key === "quantity"
                                    )?.visible && (
                                      <TableCell>
                                        <Input
                                          type="number"
                                          min="1"
                                          value={line.quantity}
                                          onChange={(e) =>
                                            updateLine(globalIndex, {
                                              quantity:
                                                parseInt(e.target.value) || 1,
                                            })
                                          }
                                          className="w-20 border-0 focus-visible:ring-1"
                                          required
                                        />
                                      </TableCell>
                                    )}
                                    {columns.find(
                                      (col) => col.key === "unitPrice"
                                    )?.visible && (
                                      <TableCell>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={line.unitPriceBase}
                                          onChange={(e) =>
                                            updateLine(globalIndex, {
                                              unitPriceBase:
                                                parseFloat(e.target.value) || 0,
                                            })
                                          }
                                          className="w-24 border-0 focus-visible:ring-1"
                                          required
                                        />
                                      </TableCell>
                                    )}
                                    {columns.find(
                                      (col) => col.key === "personnel"
                                    )?.visible && (
                                      <TableCell>
                                        <Input
                                          type="number"
                                          min="1"
                                          value={line.personnelCount}
                                          onChange={(e) =>
                                            updateLine(globalIndex, {
                                              personnelCount:
                                                parseInt(e.target.value) || 1,
                                            })
                                          }
                                          className="w-20 border-0 focus-visible:ring-1"
                                          required
                                        />
                                      </TableCell>
                                    )}
                                    {columns.find(
                                      (col) => col.key === "discount"
                                    )?.visible && (
                                      <TableCell>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          max="100"
                                          value={line.discountPercent || ""}
                                          onChange={(e) =>
                                            updateLine(globalIndex, {
                                              discountPercent:
                                                parseFloat(e.target.value) || 0,
                                            })
                                          }
                                          className="w-20 border-0 focus-visible:ring-1"
                                        />
                                      </TableCell>
                                    )}
                                    {columns.find((col) => col.key === "tax")
                                      ?.visible && (
                                      <TableCell>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={line.taxPercent || ""}
                                          onChange={(e) =>
                                            updateLine(globalIndex, {
                                              taxPercent:
                                                parseFloat(e.target.value) || 0,
                                            })
                                          }
                                          className="w-20 border-0 focus-visible:ring-1"
                                        />
                                      </TableCell>
                                    )}
                                    {columns.find((col) => col.key === "total")
                                      ?.visible && (
                                      <TableCell className="font-medium">
                                        ${line.totalAfterDiscountBase}
                                      </TableCell>
                                    )}
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>

          {/* Totals */}
          {lines.length > 0 && (
            <div className="border-t pt-4 space-y-2 bg-white p-4 rounded-lg border">
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Subtotal:</span>
                <span className="font-semibold">${subtotal.toFixed(2)}</span>
              </div>
              {taxTotal > 0 && (
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Tax:</span>
                  <span className="font-semibold">${taxTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold border-t pt-2">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Additional notes or terms..."
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/invoices")}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleSubmit("DRAFT")}
              disabled={isLoading}
            >
              {isLoading ? "Updating..." : "Update as Draft"}
            </Button>
            <Button
              type="button"
              onClick={() => handleSubmit("PENDING")}
              disabled={isLoading}
            >
              {isLoading ? "Updating..." : "Update & Send Invoice"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
