// components/invoices-table.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Undo,
  FileText,
  Send,
  Download,
  Copy,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

// types/index.ts
export type BillingStatus =
  | "DRAFT"
  | "PENDING"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

export type BillingLine = {
  id: number;
  billingId: number;
  lineType: "MISSION" | "SERVICE" | "CUSTOM";
  description: string;
  missionId?: number;
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
  createdAt: string;
  updatedAt: string;
};

export type Billing = {
  id: number;
  invoiceNumber: string;
  companyId: number;
  clientId: number;
  contractId?: number;
  generatedById?: number;
  periodStart: string;
  periodEnd: string;
  invoiceDate: string;
  dueDate?: string;
  amountBaseCurrency: number;
  targetCurrency?: string;
  conversionRate?: number;
  rateSource?: string;
  amountTargetCurrency?: number;
  status: BillingStatus;
  taxTotalBase?: number;
  taxTotalTarget?: number;
  notes?: string;
  lines: BillingLine[];
  payments: any[];
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
  client?: {
    id: number;
    name: string;
    type: string;
    address?: string;
    tax_number?: string;
  };
  contract?: {
    id: number;
    contractNumber: string;
  };
  generatedBy?: {
    id: number;
    name: string;
  };
};

export type QueryInvoicesDto = {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?:
    | "invoiceNumber"
    | "invoiceDate"
    | "dueDate"
    | "amountBaseCurrency"
    | "status";
  sortOrder?: "asc" | "desc";
  deletedOnly?: boolean;
  startDate?: string;
  endDate?: string;
  status?: BillingStatus;
  clientId?: number;
};

type InvoicesResponse = {
  data: Billing[];
  total: number;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export default function InvoicesTable() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const previewRef = useRef<HTMLDivElement>(null);

  // State for client-side only values
  const [isClient, setIsClient] = useState(false);
  const [hasManagePermission, setHasManagePermission] = useState(false);
  const [companyId, setCompanyId] = useState<number>(0);
  const [selectedInvoice, setSelectedInvoice] = useState<Billing | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // State for table controls
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] =
    useState<QueryInvoicesDto["sortBy"]>("invoiceDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [deletedOnly, setDeletedOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<BillingStatus | "">("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [clientId, setClientId] = useState<number | "">("");

  // Set client-side values after mount
  useEffect(() => {
    setIsClient(true);
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    const permissions = storedUser.permissions || [];
    setHasManagePermission(permissions.includes("billing.manage"));
    setCompanyId(storedUser.companyId || 0);
  }, []);

  // Fetch invoices data
  const {
    data: invoicesData,
    isLoading: invoicesLoading,
    error: invoicesError,
  } = useQuery<InvoicesResponse>({
    queryKey: [
      "invoices",
      companyId,
      page,
      pageSize,
      search,
      sortBy,
      sortOrder,
      deletedOnly,
      statusFilter,
      startDate,
      endDate,
      clientId,
    ],
    queryFn: async () => {
      if (!companyId) return { data: [], total: 0 };

      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...(search && { search }),
        sortBy: sortBy || "invoiceDate",
        sortOrder,
        ...(deletedOnly && { deletedOnly: "true" }),
        ...(statusFilter && { status: statusFilter }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(clientId && { clientId: clientId.toString() }),
      });

      const response = await api.get(
        `/billings?companyId=${companyId}&${params.toString()}`
      );

      return {
        data: response.data?.data || response.data || [],
        total: response.data?.meta?.total || response.total || 0,
        meta: response.data?.meta,
      };
    },
    enabled: !!companyId,
  });

  // Fetch clients for filter
  const { data: clientsData } = useQuery({
    queryKey: ["clients", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const response = await api.get(`/clients?companyId=${companyId}`);
      return response.data?.data || response.data || [];
    },
    enabled: !!companyId,
  });

  // Delete invoice mutation
  const deleteMutation = useMutation({
    mutationFn: (invoiceId: number) => api.delete(`/billings/${invoiceId}`),
    onSuccess: () => {
      toast.success("Invoice deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete invoice");
    },
  });

  // Restore invoice mutation (if you have soft delete)
  const restoreMutation = useMutation({
    mutationFn: (invoiceId: number) =>
      api.post(`/billings/${invoiceId}/restore`),
    onSuccess: () => {
      toast.success("Invoice restored successfully");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to restore invoice");
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({
      invoiceId,
      status,
    }: {
      invoiceId: number;
      status: BillingStatus;
    }) => api.put(`/billings/${invoiceId}/status`, { status }),
    onSuccess: () => {
      toast.success("Invoice status updated");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update invoice status"
      );
    },
  });

  // Duplicate invoice mutation
  const duplicateMutation = useMutation({
    mutationFn: (invoiceId: number) =>
      api.post(`/billings/${invoiceId}/duplicate`),
    onSuccess: () => {
      toast.success("Invoice duplicated successfully");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to duplicate invoice"
      );
    },
  });

  const handleDelete = (invoiceId: number) => {
    if (confirm("Are you sure you want to delete this invoice?")) {
      deleteMutation.mutate(invoiceId);
    }
  };

  const handleRestore = (invoiceId: number) => {
    restoreMutation.mutate(invoiceId);
  };

  const handleStatusUpdate = (invoiceId: number, status: BillingStatus) => {
    updateStatusMutation.mutate({ invoiceId, status });
  };

  const handleDuplicate = (invoiceId: number) => {
    duplicateMutation.mutate(invoiceId);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status: BillingStatus) => {
    const statusConfig = {
      DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-800" },
      PENDING: { label: "Pending", color: "bg-blue-100 text-blue-800" },
      PAID: { label: "Paid", color: "bg-green-100 text-green-800" },
      OVERDUE: { label: "Overdue", color: "bg-red-100 text-red-800" },
      CANCELLED: { label: "Cancelled", color: "bg-orange-100 text-orange-800" },
    };

    const config = statusConfig[status] || statusConfig.DRAFT;

    return (
      <Badge variant="secondary" className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const handleViewInvoice = (invoiceId: number) => {
    router.push(`/invoices/${invoiceId}`);
  };

  const handleEditInvoice = (invoiceId: number) => {
    router.push(`/invoices/edit/${invoiceId}`);
  };

  const handleCreateInvoice = () => {
    router.push("/invoices/add");
  };

  // PDF Export Function
  const exportToPDF = async (invoice: Billing) => {
    if (!previewRef.current) return;

    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF("p", "mm", "a4");
      const imgData = canvas.toDataURL("image/jpeg");

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

      const fileName = `${invoice.client?.name || "Invoice"}_${
        invoice.invoiceNumber
      }_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);

      toast.success("PDF exported successfully!");
      setShowPreview(false);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to export PDF");
    }
  };

  const handlePreviewInvoice = (invoice: Billing) => {
    setSelectedInvoice(invoice);
    setShowPreview(true);
  };

  // Alternative PDF export function without html2canvas
  const exportToPDFSimple = async (invoice: Billing) => {
    try {
      const pdf = new jsPDF("p", "mm", "a4");

      // Set initial position
      let yPosition = 20;

      // Add company header
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text("INVOICE", 20, yPosition);
      yPosition += 10;

      // Invoice details
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Invoice Number: ${invoice.invoiceNumber}`, 20, yPosition);
      pdf.text(`Date: ${formatDate(invoice.invoiceDate)}`, 120, yPosition);
      yPosition += 8;

      if (invoice.dueDate) {
        pdf.text(`Due Date: ${formatDate(invoice.dueDate)}`, 120, yPosition);
        yPosition += 8;
      }

      yPosition += 10;

      // Client information
      pdf.setFont("helvetica", "bold");
      pdf.text("Bill To:", 20, yPosition);
      pdf.setFont("helvetica", "normal");
      yPosition += 8;
      pdf.text(invoice.client?.name || "N/A", 20, yPosition);
      yPosition += 6;

      if (invoice.client?.address) {
        pdf.text(invoice.client.address, 20, yPosition);
        yPosition += 6;
      }

      yPosition += 10;

      // Billing period
      pdf.text(
        `Billing Period: ${formatDate(invoice.periodStart)} - ${formatDate(
          invoice.periodEnd
        )}`,
        20,
        yPosition
      );
      yPosition += 15;

      // Table header
      pdf.setFont("helvetica", "bold");
      pdf.text("Description", 20, yPosition);
      pdf.text("Qty", 120, yPosition);
      pdf.text("Unit Price", 140, yPosition);
      pdf.text("Total", 170, yPosition);
      yPosition += 8;

      // Draw line under header
      pdf.line(20, yPosition, 190, yPosition);
      yPosition += 10;

      // Invoice lines
      pdf.setFont("helvetica", "normal");
      invoice.lines.forEach((line, index) => {
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.text(line.description.substring(0, 50), 20, yPosition);
        pdf.text(line.quantity.toString(), 120, yPosition);
        pdf.text(`$${line.unitPriceBase}`, 140, yPosition);
        pdf.text(`$${line.totalAfterDiscountBase}`, 170, yPosition);
        yPosition += 8;
      });

      yPosition += 10;

      // Totals
      const subtotal = invoice.amountBaseCurrency - (invoice.taxTotalBase || 0);

      pdf.text(`Subtotal: $${subtotal}`, 140, yPosition);
      yPosition += 8;

      if (invoice.taxTotalBase && invoice.taxTotalBase > 0) {
        pdf.text(`Tax: $${invoice.taxTotalBase}`, 140, yPosition);
        yPosition += 8;
      }

      pdf.setFont("helvetica", "bold");
      pdf.text(`Total: $${invoice.amountBaseCurrency}`, 140, yPosition);

      // Notes
      if (invoice.notes) {
        yPosition += 20;
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.setFont("helvetica", "bold");
        pdf.text("Notes:", 20, yPosition);
        yPosition += 8;
        pdf.setFont("helvetica", "normal");

        // Split notes into multiple lines if too long
        const splitNotes = pdf.splitTextToSize(invoice.notes, 170);
        pdf.text(splitNotes, 20, yPosition);
      }

      const fileName = `${invoice.client?.name || "Invoice"}_${
        invoice.invoiceNumber
      }_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);

      toast.success("PDF exported successfully!");
      setShowPreview(false);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to export PDF");
    }
  };

  const columns: ColumnDef<Billing>[] = [
    {
      accessorKey: "invoiceNumber",
      header: "Invoice #",
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.invoiceNumber}
          {row.original.isDeleted && (
            <Badge variant="outline" className="ml-2 bg-red-50 text-red-700">
              Deleted
            </Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "client.name",
      header: "Client",
      cell: ({ row }) => row.original.client?.name || "N/A",
    },
    {
      accessorKey: "invoiceDate",
      header: "Invoice Date",
      cell: ({ row }) => formatDate(row.original.invoiceDate),
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) => formatDate(row.original.dueDate),
    },
    {
      accessorKey: "periodStart",
      header: "Period",
      cell: ({ row }) => (
        <div className="text-sm">
          {formatDate(row.original.periodStart)} -{" "}
          {formatDate(row.original.periodEnd)}
        </div>
      ),
    },
    {
      accessorKey: "amountBaseCurrency",
      header: "Amount",
      cell: ({ row }) => (
        <div className="font-medium">
          {formatCurrency(row.original.amountBaseCurrency)}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const invoice = row.original;
        const isMutating =
          deleteMutation.isPending ||
          updateStatusMutation.isPending ||
          restoreMutation.isPending;
        const isDeleted = invoice.isDeleted;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0"
                disabled={isMutating}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => handleViewInvoice(invoice.id)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>

              {!isDeleted && (
                <>
                  <DropdownMenuItem
                    onClick={() => handlePreviewInvoice(invoice)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Preview & Export PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportToPDFSimple(invoice)}>
                    <Download className="mr-2 h-4 w-4" />
                    Quick Export PDF
                  </DropdownMenuItem>
                </>
              )}

              {hasManagePermission && (
                <>
                  {!isDeleted ? (
                    <>
                      <DropdownMenuItem
                        onClick={() => handleEditInvoice(invoice.id)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => handleDuplicate(invoice.id)}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>

                      {invoice.status === "DRAFT" && (
                        <DropdownMenuItem
                          onClick={() =>
                            handleStatusUpdate(invoice.id, "PENDING")
                          }
                        >
                          <Send className="mr-2 h-4 w-4" />
                          Mark as Pending
                        </DropdownMenuItem>
                      )}

                      {invoice.status === "PENDING" && (
                        <DropdownMenuItem
                          onClick={() => handleStatusUpdate(invoice.id, "PAID")}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Mark as Paid
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={() => handleDelete(invoice.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => handleRestore(invoice.id)}
                      className="text-green-600"
                    >
                      <Undo className="mr-2 h-4 w-4" />
                      Restore
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Handle errors
  useEffect(() => {
    if (invoicesError) {
      toast.error("Failed to fetch invoices");
    }
  }, [invoicesError]);

  // Show loading state while checking client-side
  if (!isClient) {
    return (
      <div className="space-y-6 p-6 bg-background rounded-lg border">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-background rounded-lg border">
      {/* Invoice Preview Modal */}
      {showPreview && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Invoice Preview - {selectedInvoice.invoiceNumber}</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowPreview(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => exportToPDF(selectedInvoice)}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export PDF
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Hidden PDF Preview */}
              <div className="hidden">
                <div ref={previewRef} className="bg-white p-6 w-[210mm]">
                  {/* Invoice Header */}
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">
                        INVOICE
                      </h1>
                      <p className="text-gray-600">
                        Date: {formatDate(selectedInvoice.invoiceDate)}
                      </p>
                      {selectedInvoice.dueDate && (
                        <p className="text-gray-600">
                          Due Date: {formatDate(selectedInvoice.dueDate)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <h2 className="text-lg font-semibold">Your Company</h2>
                      <p className="text-gray-600">Company Address</p>
                      <p className="text-gray-600">Tax Info</p>
                    </div>
                  </div>

                  {/* Client Info */}
                  <div className="mb-6">
                    <h3 className="font-semibold mb-2">Bill To:</h3>
                    <p className="text-gray-700">
                      {selectedInvoice.client?.name}
                    </p>
                    {selectedInvoice.client?.address && (
                      <p className="text-gray-600">
                        {selectedInvoice.client.address}
                      </p>
                    )}
                    {selectedInvoice.client?.tax_number && (
                      <p className="text-gray-600">
                        Tax: {selectedInvoice.client.tax_number}
                      </p>
                    )}
                  </div>

                  {/* Billing Period */}
                  <div className="mb-6">
                    <h3 className="font-semibold">Billing Period:</h3>
                    <p className="text-gray-700">
                      {formatDate(selectedInvoice.periodStart)}
                      {" to "}
                      {formatDate(selectedInvoice.periodEnd)}
                    </p>
                  </div>
                  {/* Invoice Lines Table */}
                  {selectedInvoice.lines.length > 0 && (
                    <div className="mb-6">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-300 px-3 py-2 text-left">
                              Description
                            </th>
                            <th className="border border-gray-300 px-3 py-2 text-center">
                              Qty
                            </th>
                            <th className="border border-gray-300 px-3 py-2 text-right">
                              Unit Price
                            </th>
                            <th className="border border-gray-300 px-3 py-2 text-right">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedInvoice.lines.map((line, index) => (
                            <tr key={line.id}>
                              <td className="border border-gray-300 px-3 py-2">
                                {line.description}
                                {line.lineType === "MISSION" && (
                                  <span className="text-xs text-gray-500 ml-2">
                                    (Mission)
                                  </span>
                                )}
                                {line.lineType === "SERVICE" && (
                                  <span className="text-xs text-gray-500 ml-2">
                                    (Service)
                                  </span>
                                )}
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-center">
                                {line.quantity}
                                {line.personnelCount > 1 &&
                                  ` × ${line.personnelCount} personnel`}
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-right">
                                ${line.unitPriceBase}
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-right">
                                ${line.totalAfterDiscountBase}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Totals */}
                  <div className="flex justify-end">
                    <div className="w-64">
                      <div className="flex justify-between py-1">
                        <span className="font-semibold">Subtotal:</span>
                        <span className="font-semibold">
                          $
                          {selectedInvoice.amountBaseCurrency -
                            (selectedInvoice.taxTotalBase || 0)}
                        </span>
                      </div>
                      {selectedInvoice.taxTotalBase &&
                        selectedInvoice.taxTotalBase > 0 && (
                          <div className="flex justify-between py-1">
                            <span className="font-semibold">Tax:</span>
                            <span className="font-semibold">
                              ${selectedInvoice.taxTotalBase}
                            </span>
                          </div>
                        )}
                      <div className="flex justify-between py-2 border-t border-gray-300">
                        <span className="font-bold text-lg">Total:</span>
                        <span className="font-bold text-lg">
                          ${selectedInvoice.amountBaseCurrency}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedInvoice.notes && (
                    <div className="mt-8 pt-4 border-t border-gray-300">
                      <h3 className="font-semibold mb-2">Notes:</h3>
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {selectedInvoice.notes}
                      </p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-12 pt-4 border-t border-gray-300 text-center text-gray-600">
                    <p>Thank you for your business!</p>
                    <p className="text-sm">
                      Please make payment within 30 days
                    </p>
                  </div>
                </div>
              </div>

              {/* Visible Preview */}
              <div className="bg-white p-6 border rounded-lg">
                {/* Same content as the hidden PDF preview but visible to user */}
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      INVOICE
                    </h1>
                    <p className="text-gray-600">
                      Date: {formatDate(selectedInvoice.invoiceDate)}
                    </p>
                    {selectedInvoice.dueDate && (
                      <p className="text-gray-600">
                        Due Date: {formatDate(selectedInvoice.dueDate)}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <h2 className="text-lg font-semibold">Your Company</h2>
                    <p className="text-gray-600">Company Address</p>
                    <p className="text-gray-600">Tax Info</p>
                  </div>
                </div>

                {/* Client Info */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Bill To:</h3>
                  <p className="text-gray-700">
                    {selectedInvoice.client?.name}
                  </p>
                  {selectedInvoice.client?.address && (
                    <p className="text-gray-600">
                      {selectedInvoice.client.address}
                    </p>
                  )}
                </div>

                {/* Invoice content continues... (same as hidden div) */}
                <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500">
                    This is a preview of how the PDF will look. Click "Export
                    PDF" to download.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rest of your existing table code remains the same */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Invoices</h2>
          <p className="text-sm text-muted-foreground">
            Manage and track all your invoices
            {deletedOnly && " - Showing deleted invoices only"}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Show Deleted Only Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="show-deleted"
              checked={deletedOnly}
              onCheckedChange={setDeletedOnly}
            />
            <Label htmlFor="show-deleted" className="text-sm">
              Show Deleted Only
            </Label>
          </div>

          {/* Add Invoice Button */}
        </div>
      </div>
      <br></br>
      {hasManagePermission && !deletedOnly && (
        <Button
          onClick={handleCreateInvoice}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Invoice
        </Button>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="space-y-2">
          <Label htmlFor="invoice-search">Search</Label>
          <Input
            id="invoice-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoices..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status-filter">Status</Label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as BillingStatus | "")
            }
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            disabled={deletedOnly}
          >
            <option value="">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="client-filter">Client</Label>
          <select
            id="client-filter"
            value={clientId}
            onChange={(e) =>
              setClientId(e.target.value ? Number(e.target.value) : "")
            }
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            disabled={deletedOnly}
          >
            <option value="">All Clients</option>
            {clientsData?.map((client: any) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="start-date">From Date</Label>
          <Input
            type="date"
            id="start-date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={deletedOnly}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end-date">To Date</Label>
          <Input
            type="date"
            id="end-date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={deletedOnly}
          />
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={invoicesData?.data || []}
        loading={invoicesLoading}
        pageCount={Math.ceil((invoicesData?.total || 0) / pageSize)}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSortChange={(newSortBy, newSortOrder) => {
          setSortBy(newSortBy as QueryInvoicesDto["sortBy"]);
          setSortOrder(newSortOrder);
        }}
      />

      {/* Summary Stats */}
      {invoicesData?.data && invoicesData.data.length > 0 && !deletedOnly && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{invoicesData.data.length}</div>
            <div className="text-sm text-muted-foreground">Total Invoices</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {invoicesData.data.filter((i) => i.status === "PAID").length}
            </div>
            <div className="text-sm text-muted-foreground">Paid</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {invoicesData.data.filter((i) => i.status === "PENDING").length}
            </div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {invoicesData.data.filter((i) => i.status === "OVERDUE").length}
            </div>
            <div className="text-sm text-muted-foreground">Overdue</div>
          </div>
        </div>
      )}

      {/* Empty State for Deleted Only */}
      {deletedOnly && invoicesData?.data && invoicesData.data.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>No deleted invoices found</p>
        </div>
      )}
    </div>
  );
}
