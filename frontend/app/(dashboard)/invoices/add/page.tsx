// components/invoices/AddInvoice.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

// Updated Types
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
  billingId: number;
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

// Updated CreateBillingData to include columnConfig
interface CreateBillingData {
  clientId: number;
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
  columnConfigs?: ColumnConfig[]; // Add column configuration
}

// API functions (updated to include services)
const invoiceApi = {
  createInvoice: async (data: CreateBillingData, token: string | null) => {
    if (!token) throw new Error("Authentication required");

    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    if (!API_URL) throw new Error("API URL not configured");

    const response = await fetch(`${API_URL}/billings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(
        `Failed to create invoice: ${response.status} ${errorData}`
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
      `${API_URL}/missions/getMissionByIdContract/${contractId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) throw new Error("Failed to fetch missions");
    return response.json();
  },

  getAllServices: async (
    companyId: number,
    token: string | null
  ): Promise<Service[]> => {
    if (!token) throw new Error("Authentication required");

    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    if (!API_URL) throw new Error("API URL not configured");

    const response = await fetch(
      `${API_URL}/services/findAllServices?companyId=${companyId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) throw new Error("Failed to fetch services");
    return response.json();
  },
};

export default function AddInvoice() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [companyId, setCompanyId] = useState<number>(0);
  const [token, setToken] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [contracts, setContracts] = useState<ClientContract[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [selectedMissionIds, setSelectedMissionIds] = useState<number[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);

  const [formData, setFormData] = useState({
    clientId: 0,
    contractId: 0,
    periodStart: "",
    periodEnd: "",
    invoiceDate: format(new Date(), "yyyy-MM-dd"),
    dueDate: "",
    notes: "",
    companyId: null,
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

  // Initialize auth data
  useEffect(() => {
    const userData = localStorage.getItem("user");
    const authToken = localStorage.getItem("token");

    if (userData) {
      try {
        const user = JSON.parse(userData);

        setFormData((prev) => ({
          ...prev,
          companyId: user.companyId || 0,
        }));
        setCompanyId(user.companyId || 0);
      } catch (error) {
        console.error("Error parsing user data:", error);
        showAlert("Error loading user data", "error");
      }
    }

    setToken(authToken);
  }, []);

  // React Query Mutation for creating invoice
  const createInvoiceMutation = useMutation({
    mutationFn: (data: CreateBillingData) =>
      invoiceApi.createInvoice(data, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      showAlert("Invoice created successfully!", "success");
      setTimeout(() => router.push("/invoices"), 1500);
    },
    onError: (error: Error) => {
      showAlert(error.message || "Failed to create invoice", "error");
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
      if (formData.contractId <= 0 || !token) return;

      try {
        const missionsData = await invoiceApi.getMissionsForBilling(
          formData.contractId,
          token
        );
        setMissions(missionsData);
        setSelectedMissionIds([]); // Reset selected missions when missions change
      } catch (error) {
        console.error("Error fetching missions:", error);
        setMissions([]);
        setSelectedMissionIds([]);
      }
    };

    fetchMissions();
  }, [formData.contractId, token]);

  // Fetch all services when company is available
  useEffect(() => {
    const fetchServices = async () => {
      if (!companyId || !token) return;

      try {
        const servicesData = await invoiceApi.getAllServices(companyId, token);
        setAllServices(servicesData);
      } catch (error) {
        console.error("Error fetching services:", error);
        showAlert("Failed to load services", "error");
      }
    };

    fetchServices();
  }, [companyId, token]);

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

  // Handle mission selection change
  const handleMissionSelectionChange = useCallback((missionIds: number[]) => {
    setSelectedMissionIds(missionIds);
  }, []);

  // Handle service selection change
  const handleServiceSelectionChange = useCallback((serviceIds: number[]) => {
    setSelectedServiceIds(serviceIds);
  }, []);

  // Generate billing lines based on selected missions and services
  const generateBillingLines = useCallback(() => {
    const newLines: BillingLine[] = [];

    // Add selected missions as MISSION type lines
    selectedMissionIds.forEach((missionId) => {
      const mission = missions.find((m) => m.id === missionId);
      if (mission) {
        const missionLine: BillingLine = {
          id: Date.now() + missionId,
          billingId: 0,
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
      }
    });

    // Add selected services as SERVICE type lines
    selectedServiceIds.forEach((serviceId) => {
      const service = allServices.find((s) => s.id === serviceId);
      if (service) {
        const serviceLine: BillingLine = {
          id: Date.now() + serviceId + 100000, // Ensure unique ID
          billingId: 0,
          lineType: "SERVICE",
          description: service.name,
          serviceId: service.id,
          personnelCount: 1,
          quantity: 1,
          unitPriceBase: service.unitPrice,
          lineTotalBase: service.unitPrice,
          discountPercent: 0,
          discountAmountBase: 0,
          totalAfterDiscountBase: service.unitPrice,
          taxPercent: 0,
          taxAmountBase: 0,
        };
        newLines.push(serviceLine);
      }
    });

    setLines(newLines);
  }, [selectedMissionIds, selectedServiceIds, missions, allServices]);

  // Update billing lines when selections change
  useEffect(() => {
    if (selectedMissionIds.length > 0 || selectedServiceIds.length > 0) {
      generateBillingLines();
    } else {
      setLines([]);
    }
  }, [selectedMissionIds, selectedServiceIds, generateBillingLines]);

  const addCustomLine = useCallback(() => {
    const newLine: BillingLine = {
      id: Date.now(),
      billingId: 0,
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
  }, []);

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

      // If it's a mission line, remove from selected missions
      if (lineToRemove.lineType === "MISSION" && lineToRemove.missionId) {
        setSelectedMissionIds((prev) =>
          prev.filter((id) => id !== lineToRemove.missionId)
        );
      }

      // If it's a service line, remove from selected services
      if (lineToRemove.lineType === "SERVICE" && lineToRemove.serviceId) {
        setSelectedServiceIds((prev) =>
          prev.filter((id) => id !== lineToRemove.serviceId)
        );
      }

      return newLines;
    });
  }, []);

  const calculateTotals = useCallback(() => {
    const subtotal = parseFloat(
      lines
        .reduce((sum, line) => sum + line.totalAfterDiscountBase, 0)
        .toFixed(2)
    );
    const taxTotal = parseFloat(
      lines.reduce((sum, line) => sum + (line.taxAmountBase || 0), 0).toFixed(2)
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

    const invoiceData: CreateBillingData = {
      companyId: companyId,
      clientId: formData.clientId,
      contractId: formData.contractId > 0 ? formData.contractId : undefined,
      periodStart: formData.periodStart,
      periodEnd: formData.periodEnd,
      invoiceDate: formData.invoiceDate,
      dueDate: formData.dueDate || undefined,
      notes: formData.notes || undefined,
      lines: lines.map((line) => ({
        lineType: line.lineType,
        description: line.description,
        missionId: line.missionId,
        assignmentId: line.assignmentId,
        missionServiceId: line.missionServiceId,
        missionServiceRequirementId: line.missionServiceRequirementId,
        personnelId: line.personnelId,
        serviceId: line.serviceId,
        contractId: line.contractId,
        personnelCount: line.personnelCount,
        quantity: line.quantity,
        unitPriceBase: line.unitPriceBase,
        lineTotalBase: line.lineTotalBase,
        discountPercent: line.discountPercent,
        discountAmountBase: line.discountAmountBase,
        totalAfterDiscountBase: line.totalAfterDiscountBase,
        taxPercent: line.taxPercent,
        taxAmountBase: line.taxAmountBase,
      })),
      // Include column configuration in the billing data
      columnConfigs: columns,
    };

    createInvoiceMutation.mutate(invoiceData);
  };

  const { subtotal, taxTotal, total } = calculateTotals();

  // Group lines by type for better display
  const missionLines = lines.filter((line) => line.lineType === "MISSION");
  const serviceLines = lines.filter((line) => line.lineType === "SERVICE");
  const customLines = lines.filter((line) => line.lineType === "CUSTOM");

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
          <CardTitle>Create New Invoice</CardTitle>
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

          {/* Mission Selection */}
          {missions.length > 0 && (
            <div className="space-y-4">
              <Label>Select Missions</Label>
              <div className="relative">
                <Select
                  onValueChange={(value) => {
                    const missionId = parseInt(value);
                    if (!selectedMissionIds.includes(missionId)) {
                      handleMissionSelectionChange([
                        ...selectedMissionIds,
                        missionId,
                      ]);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose missions to add..." />
                  </SelectTrigger>
                  <SelectContent>
                    {missions
                      .filter(
                        (mission) => !selectedMissionIds.includes(mission.id)
                      )
                      .map((mission) => (
                        <SelectItem
                          key={mission.id}
                          value={mission.id.toString()}
                        >
                          <div>
                            <div>Mission {mission.id}</div>
                            <div className="text-sm text-gray-500">
                              {mission.contract.contractNumber} -{" "}
                              {format(
                                new Date(mission.startDate),
                                "MMM dd, yyyy"
                              )}{" "}
                              to{" "}
                              {format(
                                new Date(mission.endDate),
                                "MMM dd, yyyy"
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Selected Missions Display */}
              {selectedMissionIds.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Missions ({selectedMissionIds.length})</Label>
                  <div className="border rounded-lg p-3 space-y-2">
                    {selectedMissionIds.map((missionId) => {
                      const mission = missions.find((m) => m.id === missionId);
                      return (
                        <div
                          key={missionId}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <div>
                            <div className="font-medium">
                              Mission {missionId}
                            </div>
                            {mission && (
                              <div className="text-sm text-gray-500">
                                {mission.contract.contractNumber} -{" "}
                                {mission.requiredPersonnel} personnel
                              </div>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              handleMissionSelectionChange(
                                selectedMissionIds.filter(
                                  (id) => id !== missionId
                                )
                              );
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Service Selection */}
          {allServices.length > 0 && (
            <div className="space-y-4">
              <Label>Select Additional Services</Label>
              <div className="relative">
                <Select
                  onValueChange={(value) => {
                    const serviceId = parseInt(value);
                    if (!selectedServiceIds.includes(serviceId)) {
                      handleServiceSelectionChange([
                        ...selectedServiceIds,
                        serviceId,
                      ]);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose services to add..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allServices
                      .filter(
                        (service) => !selectedServiceIds.includes(service.id)
                      )
                      .map((service) => (
                        <SelectItem
                          key={service.id}
                          value={service.id.toString()}
                        >
                          <div>
                            <div>{service.name}</div>
                            <div className="text-sm text-gray-500">
                              ${service.unitPrice} - {service.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Selected Services Display */}
              {selectedServiceIds.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Services ({selectedServiceIds.length})</Label>
                  <div className="border rounded-lg p-3 space-y-2">
                    {selectedServiceIds.map((serviceId) => {
                      const service = allServices.find(
                        (s) => s.id === serviceId
                      );
                      return (
                        <div
                          key={serviceId}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <div>
                            <div className="font-medium">{service?.name}</div>
                            <div className="text-sm text-gray-500">
                              ${service?.unitPrice} - {service?.description}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              handleServiceSelectionChange(
                                selectedServiceIds.filter(
                                  (id) => id !== serviceId
                                )
                              );
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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
                          checked={column.visible}
                          onChange={() => toggleColumn(column.key)}
                        />
                        <Label className="text-sm">{column.label}</Label>
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
                No lines added. Select missions or services above.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Mission Lines */}
                {missionLines.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">
                      Mission Lines ({missionLines.length})
                    </h4>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {columns.find((col) => col.key === "type")
                              ?.visible && <TableHead>Type</TableHead>}
                            {columns.find((col) => col.key === "description")
                              ?.visible && <TableHead>Description</TableHead>}
                            {columns.find((col) => col.key === "quantity")
                              ?.visible && <TableHead>Qty</TableHead>}
                            {columns.find((col) => col.key === "unitPrice")
                              ?.visible && <TableHead>Unit Price</TableHead>}
                            {columns.find((col) => col.key === "personnel")
                              ?.visible && <TableHead>Personnel</TableHead>}
                            {columns.find((col) => col.key === "discount")
                              ?.visible && <TableHead>Discount %</TableHead>}
                            {columns.find((col) => col.key === "tax")
                              ?.visible && <TableHead>Tax %</TableHead>}
                            {columns.find((col) => col.key === "total")
                              ?.visible && <TableHead>Total</TableHead>}
                            <TableHead>Action</TableHead>
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
                                    <Badge variant="default">
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
                                {columns.find((col) => col.key === "quantity")
                                  ?.visible && (
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
                                {columns.find((col) => col.key === "unitPrice")
                                  ?.visible && (
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
                                {columns.find((col) => col.key === "personnel")
                                  ?.visible && (
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
                                {columns.find((col) => col.key === "discount")
                                  ?.visible && (
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
                                    ${line.totalAfterDiscountBase.toFixed(2)}
                                  </TableCell>
                                )}
                                <TableCell>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => removeLine(globalIndex)}
                                  >
                                    Remove
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Service Lines */}
                {serviceLines.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">
                      Service Lines ({serviceLines.length})
                    </h4>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {columns.find((col) => col.key === "type")
                              ?.visible && <TableHead>Type</TableHead>}
                            {columns.find((col) => col.key === "description")
                              ?.visible && <TableHead>Description</TableHead>}
                            {columns.find((col) => col.key === "quantity")
                              ?.visible && <TableHead>Qty</TableHead>}
                            {columns.find((col) => col.key === "unitPrice")
                              ?.visible && <TableHead>Unit Price</TableHead>}
                            {columns.find((col) => col.key === "personnel")
                              ?.visible && <TableHead>Personnel</TableHead>}
                            {columns.find((col) => col.key === "discount")
                              ?.visible && <TableHead>Discount %</TableHead>}
                            {columns.find((col) => col.key === "tax")
                              ?.visible && <TableHead>Tax %</TableHead>}
                            {columns.find((col) => col.key === "total")
                              ?.visible && <TableHead>Total</TableHead>}
                            <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {serviceLines.map((line, index) => {
                            const globalIndex = lines.findIndex(
                              (l) => l.id === line.id
                            );
                            return (
                              <TableRow key={line.id}>
                                {columns.find((col) => col.key === "type")
                                  ?.visible && (
                                  <TableCell>
                                    <Badge variant="secondary">
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
                                {columns.find((col) => col.key === "quantity")
                                  ?.visible && (
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
                                {columns.find((col) => col.key === "unitPrice")
                                  ?.visible && (
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
                                {columns.find((col) => col.key === "personnel")
                                  ?.visible && (
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
                                {columns.find((col) => col.key === "discount")
                                  ?.visible && (
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
                                <TableCell>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => removeLine(globalIndex)}
                                  >
                                    Remove
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Custom Lines */}
                {customLines.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">
                      Custom Lines ({customLines.length})
                    </h4>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {columns.find((col) => col.key === "type")
                              ?.visible && <TableHead>Type</TableHead>}
                            {columns.find((col) => col.key === "description")
                              ?.visible && <TableHead>Description</TableHead>}
                            {columns.find((col) => col.key === "quantity")
                              ?.visible && <TableHead>Qty</TableHead>}
                            {columns.find((col) => col.key === "unitPrice")
                              ?.visible && <TableHead>Unit Price</TableHead>}
                            {columns.find((col) => col.key === "personnel")
                              ?.visible && <TableHead>Personnel</TableHead>}
                            {columns.find((col) => col.key === "discount")
                              ?.visible && <TableHead>Discount %</TableHead>}
                            {columns.find((col) => col.key === "tax")
                              ?.visible && <TableHead>Tax %</TableHead>}
                            {columns.find((col) => col.key === "total")
                              ?.visible && <TableHead>Total</TableHead>}
                            <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customLines.map((line, index) => {
                            const globalIndex = lines.findIndex(
                              (l) => l.id === line.id
                            );
                            return (
                              <TableRow key={line.id}>
                                {columns.find((col) => col.key === "type")
                                  ?.visible && (
                                  <TableCell>
                                    <Badge variant="outline">
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
                                {columns.find((col) => col.key === "quantity")
                                  ?.visible && (
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
                                {columns.find((col) => col.key === "unitPrice")
                                  ?.visible && (
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
                                {columns.find((col) => col.key === "personnel")
                                  ?.visible && (
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
                                {columns.find((col) => col.key === "discount")
                                  ?.visible && (
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
                                    ${line.totalAfterDiscountBase.toFixed(2)}
                                  </TableCell>
                                )}
                                <TableCell>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => removeLine(globalIndex)}
                                  >
                                    Remove
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Totals */}
          {lines.length > 0 && (
            <div className="border-t pt-4 space-y-2 bg-white p-4 rounded-lg border">
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Subtotal:</span>
                <span className="font-semibold">${subtotal}</span>
              </div>
              {taxTotal > 0 && (
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Tax:</span>
                  <span className="font-semibold">${taxTotal}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold border-t pt-2">
                <span>Total:</span>
                <span>${total}</span>
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
              {isLoading ? "Saving..." : "Save as Draft"}
            </Button>
            <Button
              type="button"
              onClick={() => handleSubmit("PENDING")}
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Save & Send Invoice"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
