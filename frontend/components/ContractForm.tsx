"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

enum ContractStatus {
  DRAFT = "DRAFT",
  SUBMITTED_FOR_REVIEW = "SUBMITTED_FOR_REVIEW",
  CONFIRMED = "CONFIRMED",
  REJECTED = "REJECTED",
}

const contractSchema = z.object({
  contractNumber: z.string().optional(),
  clientId: z.number().min(1, "Client is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  status: z
    .enum(["DRAFT", "SUBMITTED_FOR_REVIEW", "CONFIRMED", "REJECTED"])
    .default("DRAFT"),
  serviceRates: z
    .array(
      z.object({
        serviceId: z.number().min(1, "Service is required"),
        basePay: z.number().min(0, "Base pay must be non-negative"),
        extraPay: z.number().min(0, "Extra pay must be non-negative"),
        clientPrice: z.number().min(0, "Client price must be non-negative"),
      })
    )
    .optional(),
  sites: z
    .array(
      z.object({
        siteId: z.number().min(1, "Site is required"),
        startDate: z.string().min(1, "Site start date is required"),
        endDate: z.string().min(1, "Site end date is required"),
        services: z
          .array(
            z.object({
              serviceId: z.number().min(1, "Service is required"),
              requiredCount: z
                .number()
                .min(1, "Required count must be at least 1"),
              basePay: z.number().min(0, "Base pay must be non-negative"),
              extraPay: z.number().min(0, "Extra pay must be non-negative"),
              clientPrice: z
                .number()
                .min(0, "Client price must be non-negative"),
            })
          )
          .optional(),
      })
    )
    .min(1, "At least one site is required"),
});

type ContractFormData = z.infer<typeof contractSchema>;

type ContractFormProps = {
  contract?: any;
  onSuccess: () => void;
  onCancel: () => void;
};

export default function ContractForm({
  contract,
  onSuccess,
  onCancel,
}: ContractFormProps) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<{ id: number; name: string }[]>([]);
  const [sites, setSites] = useState<{ id: number; name: string }[]>([]);
  const [services, setServices] = useState<{ id: number; name: string }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | undefined>(
    undefined
  );
  const [file, setFile] = useState<File | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      contractNumber: "",
      clientId: undefined,
      startDate: "",
      endDate: "",
      status: ContractStatus.DRAFT,
      serviceRates: [],
      sites: [],
    },
  });

  const {
    fields: serviceRateFields,
    append: appendServiceRate,
    remove: removeServiceRate,
  } = useFieldArray({
    control,
    name: "serviceRates",
  });

  const {
    fields: siteFields,
    append: appendSite,
    remove: removeSite,
  } = useFieldArray({
    control,
    name: "sites",
  });

  useEffect(() => {
    fetchClients();
    fetchServices();
    if (contract) {
      reset({
        contractNumber: contract.contractNumber || "",
        clientId: contract.clientId || undefined,
        startDate: contract.startDate
          ? new Date(contract.startDate).toISOString().split("T")[0]
          : "",
        endDate: contract.endDate
          ? new Date(contract.endDate).toISOString().split("T")[0]
          : "",
        status: contract.status || ContractStatus.DRAFT,
        serviceRates: contract.serviceRates || [],
        sites:
          contract.sites?.map((s: any) => ({
            siteId: s.siteId,
            startDate: s.startDate
              ? new Date(s.startDate).toISOString().split("T")[0]
              : "",
            endDate: s.endDate
              ? new Date(s.endDate).toISOString().split("T")[0]
              : "",
            services: s.services || [],
          })) || [],
      });
      setSelectedClientId(contract.clientId);
    }
  }, [contract, reset]);

  useEffect(() => {
    if (selectedClientId) {
      fetchSites();
    } else {
      setSites([]);
    }
  }, [selectedClientId]);

  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === "clientId" && value.clientId !== selectedClientId) {
        setValue("sites", []);
        setSelectedClientId(value.clientId);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue, selectedClientId]);

  const fetchClients = async () => {
    try {
      const response = await api.get("/clients");
      setClients(response.data || []);
    } catch (err) {
      toast.error("Failed to fetch clients");
    }
  };

  const fetchSites = async () => {
    try {
      const response = await api.get(`/clients/${selectedClientId}`);
      setSites(response.sites || []);
    } catch (err) {
      toast.error("Failed to fetch sites for selected client");
    }
  };

  const fetchServices = async () => {
    try {
      const response = await api.get("/services");
      setServices(response.data || []);
    } catch (err) {
      toast.error("Failed to fetch services");
    }
  };

  const onSubmit = async (data: ContractFormData) => {
    setLoading(true);
    try {
      let response;
      let contractId: number;
      if (contract) {
        response = await api.patch(`/contracts/${contract.id}`, data);
        contractId = contract.id;
        toast.success("Contract updated successfully");
      } else {
        if (!data.contractNumber) {
          delete data.contractNumber;
        }
        response = await api.post("/contracts", data);
        contractId = response.id;
        toast.success("Contract created successfully");
      }

      if (file) {
        try {
          const formData = new FormData();
          formData.append("file", file);
          console.log("Uploading file for contract ID:", contractId);
          await api.post(`/contracts/${contractId}/file`, formData);
          toast.success("Contract file uploaded successfully");
        } catch (fileErr) {
          console.error("File upload failed:", fileErr);
          toast.error("Failed to upload contract file, but contract was saved");
        }
      }

      onSuccess();
    } catch (err) {
      console.error("Contract save failed:", err);
      toast.error("Failed to save contract");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label>Client</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className={cn(
                "w-full justify-between",
                !watch("clientId") && "text-muted-foreground"
              )}
            >
              {watch("clientId")
                ? clients.find((c) => c.id === watch("clientId"))?.name
                : "Select client"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandInput placeholder="Search client..." />
              <CommandList>
                <CommandEmpty>No client found.</CommandEmpty>
                <CommandGroup>
                  {clients.map((client) => (
                    <CommandItem
                      key={client.id}
                      value={client.name}
                      onSelect={() => {
                        setValue("clientId", client.id);
                        setSelectedClientId(client.id);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          watch("clientId") === client.id
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      {client.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {errors.clientId && (
          <p className="text-destructive text-sm">{errors.clientId.message}</p>
        )}
      </div>

      {contract && (
        <div className="space-y-2">
          <Label htmlFor="contractNumber">Contract Number (optional)</Label>
          <Input
            id="contractNumber"
            placeholder="Contract Number"
            {...register("contractNumber")}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            {...register("startDate")}
          />
          {errors.startDate && (
            <p className="text-destructive text-sm">{errors.startDate.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            {...register("endDate")}
          />
          {errors.endDate && (
            <p className="text-destructive text-sm">{errors.endDate.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select
          value={watch("status")}
          onValueChange={(value) =>
            setValue("status", value as ContractStatus)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(ContractStatus).map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Contract-Level Service Rates (optional)</Label>
        {serviceRateFields.map((_, index) => (
          <div key={index} className="flex space-x-2">
            <Select
              value={watch(`serviceRates.${index}.serviceId`)?.toString()}
              onValueChange={(value) =>
                setValue(`serviceRates.${index}.serviceId`, Number(value))
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                {(services || []).map((s) => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Base Pay"
              type="number"
              step="0.01"
              {...register(`serviceRates.${index}.basePay`, { valueAsNumber: true })}
            />
            <Input
              placeholder="Extra Pay"
              type="number"
              step="0.01"
              {...register(`serviceRates.${index}.extraPay`, { valueAsNumber: true })}
            />
            <Input
              placeholder="Client Price"
              type="number"
              step="0.01"
              {...register(`serviceRates.${index}.clientPrice`, { valueAsNumber: true })}
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={() => removeServiceRate(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            appendServiceRate({
              serviceId: 0,
              basePay: 0,
              extraPay: 0,
              clientPrice: 0,
            })
          }
        >
          <Plus className="h-4 w-4 mr-2" /> Add Service Rate
        </Button>
      </div>

      <div className="space-y-4">
        <Label>Sites</Label>
        {siteFields.map((_, siteIndex) => (
          <div key={siteIndex} className="border p-4 rounded space-y-4">
            <div className="flex space-x-2">
              <Select
                value={watch(`sites.${siteIndex}.siteId`)?.toString()}
                onValueChange={(value) =>
                  setValue(`sites.${siteIndex}.siteId`, Number(value))
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                placeholder="Site Start Date"
                {...register(`sites.${siteIndex}.startDate`)}
              />
              <Input
                type="date"
                placeholder="Site End Date"
                {...register(`sites.${siteIndex}.endDate`)}
              />
            </div>

            <div className="space-y-2">
              <Label>Site Services (optional)</Label>
              {(watch(`sites.${siteIndex}.services`) || []).map((_, serviceIndex) => (
                <div key={serviceIndex} className="flex space-x-2">
                  <Select
                    value={watch(`sites.${siteIndex}.services.${serviceIndex}.serviceId`)?.toString()}
                    onValueChange={(value) =>
                      setValue(`sites.${siteIndex}.services.${serviceIndex}.serviceId`, Number(value))
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      {(services || []).map((s) => (
                        <SelectItem key={s.id} value={s.id.toString()}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Required Count"
                    type="number"
                    min="1"
                    {...register(`sites.${siteIndex}.services.${serviceIndex}.requiredCount`, { valueAsNumber: true })}
                  />
                  <Input
                    placeholder="Base Pay"
                    type="number"
                    step="0.01"
                    {...register(`sites.${siteIndex}.services.${serviceIndex}.basePay`, { valueAsNumber: true })}
                  />
                  <Input
                    placeholder="Extra Pay"
                    type="number"
                    step="0.01"
                    {...register(`sites.${siteIndex}.services.${serviceIndex}.extraPay`, { valueAsNumber: true })}
                  />
                  <Input
                    placeholder="Client Price"
                    type="number"
                    step="0.01"
                    {...register(`sites.${siteIndex}.services.${serviceIndex}.clientPrice`, { valueAsNumber: true })}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => {
                      const services = watch(`sites.${siteIndex}.services`) || [];
                      setValue(
                        `sites.${siteIndex}.services`,
                        services.filter((_, i) => i !== serviceIndex)
                      );
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const services = watch(`sites.${siteIndex}.services`) || [];
                  setValue(`sites.${siteIndex}.services`, [
                    ...services,
                    {
                      serviceId: 0,
                      requiredCount: 1,
                      basePay: 0,
                      extraPay: 0,
                      clientPrice: 0,
                    },
                  ]);
                }}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Site Service
              </Button>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={() => removeSite(siteIndex)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            appendSite({ siteId: 0, startDate: "", endDate: "", services: [] })
          }
        >
          <Plus className="h-4 w-4 mr-2" /> Add Site
        </Button>
        {errors.sites && (
          <p className="text-destructive text-sm">{errors.sites.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="file">Contract PDF (optional)</Label>
        <Input
          id="file"
          type="file"
          accept="application/pdf"
          onChange={(e) => {
            const selectedFile = e.target.files?.[0];
            if (selectedFile) {
              if (selectedFile.size > 10 * 1024 * 1024) {
                toast.error("File size exceeds 10MB limit");
                setFile(null);
                return;
              }
              if (selectedFile.type !== "application/pdf") {
                toast.error("Only PDF files are allowed");
                setFile(null);
                return;
              }
              setFile(selectedFile);
            }
          }}
        />
        {contract != null &&
          contract.file != null &&
          contract.file.url != null && (
            <Button
              variant="link"
              onClick={() => window.open(contract.file.url, "_blank")}
            >
              View Current PDF
            </Button>
          )}
      </div>

      <div className="flex space-x-4">
        <Button type="submit" disabled={loading}>
          {loading
            ? "Saving..."
            : contract
            ? "Update Contract"
            : "Add Contract"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}