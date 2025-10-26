// app/components/PersonnelContractsManager.tsx
// Updated to accept personnel details for title

"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Trash, Edit, RotateCcw } from "lucide-react";
import api from "@/lib/api";
import { API_BASE } from "@/lib/api"; // Assuming this is your API base URL

const contractSchema = z.object({
  contractNumber: z.string().min(1, "Contract number is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required").refine((end) => {
    const start = new Date(z.string().parse(end)); // Placeholder, actual validation in form
    return true;
  }, "End date must be after start date"),
});

type Contract = {
  id: number;
  contractNumber: string;
  startDate: string;
  endDate: string;
  file?: { id: number; url: string };
  isDeleted: boolean;
};

type PersonnelContractsManagerProps = {
  personnelId: number;
  firstName: string;
  lastName: string;
  identifier?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export default function PersonnelContractsManager({ personnelId, firstName, lastName, identifier, open, onOpenChange, onSuccess }: PersonnelContractsManagerProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const form = useForm<z.infer<typeof contractSchema>>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      contractNumber: "",
      startDate: "",
      endDate: "",
    },
  });

  useEffect(() => {
    if (open) {
      fetchContracts();
    }
  }, [open]);

  useEffect(() => {
    if (selectedContract) {
      form.reset({
        contractNumber: selectedContract.contractNumber,
        startDate: format(new Date(selectedContract.startDate), "yyyy-MM-dd"),
        endDate: format(new Date(selectedContract.endDate), "yyyy-MM-dd"),
      });
    } else {
      form.reset({
        contractNumber: "",
        startDate: "",
        endDate: "",
      });
      setFile(null);
    }
  }, [selectedContract, form]);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/personnel/${personnelId}/contracts`);
      console.log('fetched raw response:', response);
      setContracts(response.data || []);
    } catch (err) {
      toast.error("Failed to fetch contracts");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: z.infer<typeof contractSchema>) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (end < start) {
      form.setError("endDate", { message: "End date must be after start date" });
      return;
    }

    try {
      const formData = new FormData();
      formData.append("contractNumber", data.contractNumber);
      formData.append("startDate", data.startDate);
      formData.append("endDate", data.endDate);
      if (file) formData.append("contractFile", file);

      if (selectedContract) {
        await api.put(`/personnel/${personnelId}/contracts/${selectedContract.id}`, formData);
        toast.success("Contract updated");
      } else {
        await api.post(`/personnel/${personnelId}/contracts`, formData);
        toast.success("Contract created");
      }
      setSelectedContract(null);
      setFile(null);
      fetchContracts();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error("Operation failed");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/personnel/${personnelId}/contracts/${id}`);
      toast.success("Contract deleted");
      fetchContracts();
    } catch (err) {
      toast.error("Failed to delete contract");
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await api.post(`/personnel/${personnelId}/contracts/${id}/restore`, {});
      toast.success("Contract restored");
      fetchContracts();
    } catch (err) {
      toast.error("Failed to restore contract");
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const actualFilename = url.split('/').pop() || filename;
      const link = document.createElement("a");
      link.href = `${API_BASE}${url}`;
      link.download = actualFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      toast.error("Failed to download contract");
    }
  };

  const personnelTitle = `${firstName} ${lastName}${identifier ? ` (ID: ${identifier})` : ''}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Manage Contracts for {personnelTitle}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-semibold">Add/Edit Contract</h3>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contractNumber">Contract Number</Label>
                <Input id="contractNumber" {...form.register("contractNumber")} />
                {form.formState.errors.contractNumber && (
                  <p className="text-red-500 text-sm">{form.formState.errors.contractNumber.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input id="startDate" type="date" {...form.register("startDate")} />
                {form.formState.errors.startDate && (
                  <p className="text-red-500 text-sm">{form.formState.errors.startDate.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input id="endDate" type="date" {...form.register("endDate")} />
                {form.formState.errors.endDate && (
                  <p className="text-red-500 text-sm">{form.formState.errors.endDate.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contractFile">Contract File (optional)</Label>
                <Input
                  id="contractFile"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
              <Button type="submit" className="w-full">
                {selectedContract ? "Update" : "Create"}
              </Button>
              {selectedContract && (
                <Button type="button" variant="outline" className="w-full" onClick={() => setSelectedContract(null)}>
                  Cancel Edit
                </Button>
              )}
            </form>
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold">Contracts List</h3>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell>{contract.contractNumber}</TableCell>
                      <TableCell>{format(new Date(contract.startDate), "yyyy-MM-dd")}</TableCell>
                      <TableCell>{format(new Date(contract.endDate), "yyyy-MM-dd")}</TableCell>
                      <TableCell>
                        {contract.file ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(contract.file!.url, `contract-${contract.id}`)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        ) : (
                          "No file"
                        )}
                      </TableCell>
                      <TableCell className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedContract(contract)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {contract.isDeleted ? (
                          <Button variant="ghost" size="icon" onClick={() => handleRestore(contract.id)}>
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(contract.id)}>
                            <Trash className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}