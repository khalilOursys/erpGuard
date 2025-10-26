"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/lib/api";

const siteSchema = z.object({
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
});

const contractSchema = z.object({
  contractNumber: z.string().optional(),
  clientId: z.number().min(1, "Client is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  sites: z
    .array(siteSchema)
    .min(1, "At least one site is required"),
}).superRefine((data, ctx) => {
  // Validate contract dates
  const contractStart = new Date(data.startDate);
  const contractEnd = new Date(data.endDate);
  if (isNaN(contractStart.getTime()) || isNaN(contractEnd.getTime())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid contract dates",
      path: ["startDate"],
    });
    return;
  }
  if (contractEnd < contractStart) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Contract end date must be after start date",
      path: ["endDate"],
    });
    return;
  }

  // Validate site dates
  data.sites.forEach((site, index) => {
    const siteStart = new Date(site.startDate);
    const siteEnd = new Date(site.endDate);
    if (isNaN(siteStart.getTime()) || isNaN(siteEnd.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid site dates",
        path: ["sites", index, "startDate"],
      });
      return;
    }
    if (siteEnd < siteStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Site end date must be after start date",
        path: ["sites", index, "endDate"],
      });
    }
    if (siteStart < contractStart || siteEnd > contractEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Site dates must be within contract date range",
        path: ["sites", index, "startDate"],
      });
    }
  });
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
      clientId: undefined as any,
      startDate: "",
      endDate: "",
      sites: [{ siteId: 0, startDate: "", endDate: "", services: [] }],
    },
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
        clientId: contract.client?.id || undefined,
        startDate: contract.startDate
          ? new Date(contract.startDate).toISOString().split("T")[0]
          : "",
        endDate: contract.endDate
          ? new Date(contract.endDate).toISOString().split("T")[0]
          : "",
        sites:
          contract.sites?.map((s: any) => ({
            siteId: s.site?.id || s.siteId,
            startDate: s.startDate
              ? new Date(s.startDate).toISOString().split("T")[0]
              : "",
            endDate: s.endDate
              ? new Date(s.endDate).toISOString().split("T")[0]
              : "",
            services: s.services?.map((ss: any) => ({
              serviceId: ss.serviceId,
              requiredCount: ss.requiredCount || 1,
              basePay: ss.basePay || 0,
              extraPay: ss.extraPay || 0,
              clientPrice: ss.clientPrice || 0,
            })) || [],
          })) || [{ siteId: 0, startDate: "", endDate: "", services: [] }],
      });
      setSelectedClientId(contract.client?.id);
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
        setValue("sites", [{ siteId: 0, startDate: "", endDate: "", services: [] }]);
        setSelectedClientId(value.clientId);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue, selectedClientId]);

  const fetchClients = async () => {
    try {
      const data = await api.get("/clients");
      setClients(data.data || []);
    } catch (err) {
      toast.error("Failed to fetch clients");
    }
  };

  const fetchSites = async () => {
    try {
      const data = await api.get(`/sites?clientId=${selectedClientId}`);
      setSites(data.data || []);
    } catch (err) {
      toast.error("Failed to fetch sites");
    }
  };

  const fetchServices = async () => {
    try {
      const data = await api.get("/services");
      setServices(data.data || []);
    } catch (err) {
      toast.error("Failed to fetch services");
    }
  };

  const onSubmit = async (data: ContractFormData) => {
    setLoading(true);
    const formData = new FormData();
    formData.append("data", JSON.stringify(data));
    if (file) {
      formData.append("file", file);
    }

    try {
      if (contract) {
        await api.patch(`/contracts/${contract.id}`, formData);
        toast.success("Contract updated successfully");
      } else {
        await api.post("/contracts", formData);
        toast.success("Contract added successfully");
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to save contract");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{contract ? "Edit Contract" : "Add Contract"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contractNumber">Contract Number</Label>
              <Input
                id="contractNumber"
                placeholder="Optional, auto-generated if blank"
                {...register("contractNumber")}
              />
              {errors.contractNumber && (
                <p className="text-destructive text-sm">{errors.contractNumber.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientId">Client</Label>
              <Select
                onValueChange={(value) => setValue("clientId", Number(value))}
                value={watch("clientId")?.toString() || ""}
              >
                <SelectTrigger id="clientId">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.clientId && (
                <p className="text-destructive text-sm">{errors.clientId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" type="date" {...register("startDate")} />
              {errors.startDate && (
                <p className="text-destructive text-sm">{errors.startDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input id="endDate" type="date" {...register("endDate")} />
              {errors.endDate && (
                <p className="text-destructive text-sm">{errors.endDate.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-lg font-semibold">Sites</Label>
            {siteFields.map((site, siteIndex) => (
              <Card key={site.id} className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="space-y-2 md:col-span-1">
                    <Label htmlFor={`sites.${siteIndex}.siteId`}>Site</Label>
                    <Select
                      onValueChange={(value) =>
                        setValue(`sites.${siteIndex}.siteId`, Number(value))
                      }
                      value={watch(`sites.${siteIndex}.siteId`)?.toString() || ""}
                    >
                      <SelectTrigger id={`sites.${siteIndex}.siteId`} className="h-9">
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
                    {errors.sites?.[siteIndex]?.siteId && (
                      <p className="text-destructive text-sm">
                        {errors.sites[siteIndex]?.siteId?.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-1">
                    <Label htmlFor={`sites.${siteIndex}.startDate`}>Start Date</Label>
                    <Input
                      id={`sites.${siteIndex}.startDate`}
                      type="date"
                      className="h-9"
                      {...register(`sites.${siteIndex}.startDate`)}
                    />
                    {errors.sites?.[siteIndex]?.startDate && (
                      <p className="text-destructive text-sm">
                        {errors.sites[siteIndex]?.startDate?.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-1">
                    <Label htmlFor={`sites.${siteIndex}.endDate`}>End Date</Label>
                    <Input
                      id={`sites.${siteIndex}.endDate`}
                      type="date"
                      className="h-9"
                      {...register(`sites.${siteIndex}.endDate`)}
                    />
                    {errors.sites?.[siteIndex]?.endDate && (
                      <p className="text-destructive text-sm">
                        {errors.sites[siteIndex]?.endDate?.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 w-full">
                  <Label className="text-md font-semibold mb-2 block">Services (Optional)</Label>
                  <div className="space-y-2">
                    {/* Service headers - full width grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 text-xs font-medium text-muted-foreground mb-2">
                      <div className="sm:col-span-2">Service</div>
                      <div className="text-center">Number of personnel</div>
                      <div className="text-center">Base pay</div>
                      <div className="text-center">Extra pay</div>
                      <div className="text-center">Client pay</div>
                      <div className="text-right"></div>
                    </div>

                    {(watch(`sites.${siteIndex}.services`) || []).map((_, serviceIndex) => (
                      <div key={serviceIndex} className="grid grid-cols-1 sm:grid-cols-7 gap-2 items-center">
                        {/* Service select (spans 2 cols) */}
                        <div className="sm:col-span-2 space-y-1">
                          <Select
                            value={watch(`sites.${siteIndex}.services.${serviceIndex}.serviceId`)?.toString() || ""}
                            onValueChange={(value) =>
                              setValue(`sites.${siteIndex}.services.${serviceIndex}.serviceId`, Number(value))
                            }
                          >
                            <SelectTrigger id={`sites.${siteIndex}.services.${serviceIndex}.serviceId`} className="h-9">
                              <SelectValue placeholder="Select service" />
                            </SelectTrigger>
                            <SelectContent>
                              {services.map((s) => (
                                <SelectItem key={s.id} value={s.id.toString()}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.sites?.[siteIndex]?.services?.[serviceIndex]?.serviceId && (
                            <p className="text-xs text-destructive">
                              {errors.sites[siteIndex]?.services?.[serviceIndex]?.serviceId?.message}
                            </p>
                          )}
                        </div>

                        {/* Number of personnel */}
                        <div className="space-y-1">
                          <Input
                            id={`sites.${siteIndex}.services.${serviceIndex}.requiredCount`}
                            type="number"
                            min="1"
                            placeholder="1"
                            className="h-9 text-center"
                            {...register(`sites.${siteIndex}.services.${serviceIndex}.requiredCount`, {
                              valueAsNumber: true,
                            })}
                          />
                          {errors.sites?.[siteIndex]?.services?.[serviceIndex]?.requiredCount && (
                            <p className="text-xs text-destructive">
                              {errors.sites[siteIndex]?.services?.[serviceIndex]?.requiredCount?.message}
                            </p>
                          )}
                        </div>

                        {/* Base pay */}
                        <div className="space-y-1">
                          <Input
                            id={`sites.${siteIndex}.services.${serviceIndex}.basePay`}
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="h-9 text-center"
                            {...register(`sites.${siteIndex}.services.${serviceIndex}.basePay`, {
                              valueAsNumber: true,
                            })}
                          />
                          {errors.sites?.[siteIndex]?.services?.[serviceIndex]?.basePay && (
                            <p className="text-xs text-destructive">
                              {errors.sites[siteIndex]?.services?.[serviceIndex]?.basePay?.message}
                            </p>
                          )}
                        </div>

                        {/* Extra pay */}
                        <div className="space-y-1">
                          <Input
                            id={`sites.${siteIndex}.services.${serviceIndex}.extraPay`}
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="h-9 text-center"
                            {...register(`sites.${siteIndex}.services.${serviceIndex}.extraPay`, {
                              valueAsNumber: true,
                            })}
                          />
                          {errors.sites?.[siteIndex]?.services?.[serviceIndex]?.extraPay && (
                            <p className="text-xs text-destructive">
                              {errors.sites[siteIndex]?.services?.[serviceIndex]?.extraPay?.message}
                            </p>
                          )}
                        </div>

                        {/* Client pay */}
                        <div className="space-y-1">
                          <Input
                            id={`sites.${siteIndex}.services.${serviceIndex}.clientPrice`}
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="h-9 text-center"
                            {...register(`sites.${siteIndex}.services.${serviceIndex}.clientPrice`, {
                              valueAsNumber: true,
                            })}
                          />
                          {errors.sites?.[siteIndex]?.services?.[serviceIndex]?.clientPrice && (
                            <p className="text-xs text-destructive">
                              {errors.sites[siteIndex]?.services?.[serviceIndex]?.clientPrice?.message}
                            </p>
                          )}
                        </div>

                        {/* Trash button — its own column, aligned to the far right */}
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="h-9 w-9"
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
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full sm:w-auto"
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
                      <Plus className="h-4 w-4 mr-2" /> Add Service
                    </Button>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="mt-4 w-full sm:w-auto"
                  onClick={() => removeSite(siteIndex)}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Remove Site
                </Button>
              </Card>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
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
            <Label htmlFor="file">Contract PDF (Optional)</Label>
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
            {contract?.file?.url && (
              <Button
                variant="link"
                onClick={() => window.open(contract.file.url, "_blank")}
              >
                View Current PDF
              </Button>
            )}
          </div>

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : contract ? "Update Contract" : "Add Contract"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}