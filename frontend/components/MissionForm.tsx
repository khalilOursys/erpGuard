"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns"; // For date formatting, install date-fns if needed

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/api";
// Import DatePicker (assuming you have a Shadcn DatePicker component)
// For example: import { DatePicker } from "@/components/ui/date-picker";

// Temp placeholder for DatePicker if not implemented
// You can replace with your actual DatePicker component
const DatePicker = ({ date, setDate }: { date: Date | undefined; setDate: (date: Date | undefined) => void }) => (
  <Input
    type="date"
    value={date ? format(date, "yyyy-MM-dd") : ""}
    onChange={(e) => setDate(e.target.value ? new Date(e.target.value) : undefined)}
  />
);

// Form schema for create/update mission
const missionSchema = z.object({
  contractId: z.number({ required_error: "Contract is required" }),
  siteId: z.number().optional(),
  startDate: z.date({ required_error: "Start date is required" }),
  endDate: z.date({ required_error: "End date is required" }),
  requiredPersonnel: z.number().min(0).optional(),
  managerId: z.number().optional(),
}).refine((data) => data.endDate > data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"],
});

type MissionFormProps = {
  mission?: any; // Partial mission data for edit
  onSuccess: () => void;
};

export default function MissionForm({ mission, onSuccess }: MissionFormProps) {
  const isEdit = !!mission;
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof missionSchema>>({
    resolver: zodResolver(missionSchema),
    defaultValues: {
      contractId: mission?.contractId,
      siteId: mission?.siteId,
      startDate: mission?.startDate ? new Date(mission.startDate) : undefined,
      endDate: mission?.endDate ? new Date(mission.endDate) : undefined,
      requiredPersonnel: mission?.requiredPersonnel ?? 0,
      managerId: mission?.managerId,
    },
  });

  useEffect(() => {
    if (mission) {
      form.reset({
        contractId: mission.contractId,
        siteId: mission.siteId,
        startDate: new Date(mission.startDate),
        endDate: new Date(mission.endDate),
        requiredPersonnel: mission.requiredPersonnel,
        managerId: mission.managerId,
      });
    } else {
      form.reset({
        contractId: undefined,
        siteId: undefined,
        startDate: undefined,
        endDate: undefined,
        requiredPersonnel: 0,
        managerId: undefined,
      });
    }
  }, [mission, form]);

  // Fetch contracts, sites, managers
  const { data: contracts } = useQuery<any[]>({
    queryKey: ["contracts"],
    queryFn: async () => {
      const { data } = await api.get("/contracts"); // Adjust query if needed, e.g., ?status=CONFIRMED
      return data?.data || [];
    },
  });

  const { data: sites } = useQuery<any[]>({
    queryKey: ["sites"],
    queryFn: async () => {
      const { data } = await api.get("/sites");
      return data?.data || [];
    },
  });

  const { data: managers } = useQuery<any[]>({
    queryKey: ["managers"],
    queryFn: async () => {
      const { data } = await api.get("/users?role=MANAGER");
      return data?.data || [];
    },
  });

  const onSubmit = async (data: z.infer<typeof missionSchema>) => {
    try {
      const payload = {
        ...data,
        startDate: format(data.startDate, "yyyy-MM-dd"),
        endDate: format(data.endDate, "yyyy-MM-dd"),
      };
      if (isEdit) {
        await api.put(`/missions/${mission.id}`, payload);
        toast.success("Mission updated");
      } else {
        await api.post("/missions", payload);
        toast.success("Mission created");
      }
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      onSuccess();
    } catch (err) {
      console.error("Operation failed:", err);
      toast.error("Operation failed");
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="contractId">Contract</Label>
        <Select
          onValueChange={(value) => form.setValue("contractId", Number(value))}
          defaultValue={form.watch("contractId")?.toString()}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select contract" />
          </SelectTrigger>
          <SelectContent>
            {contracts?.map((contract) => (
              <SelectItem key={contract.id} value={contract.id.toString()}>
                {contract.contractNumber} - {contract.client?.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.contractId && <p className="text-red-500 text-sm">{form.formState.errors.contractId.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="siteId">Site (optional)</Label>
        <Select
          onValueChange={(value) => form.setValue("siteId", value ? Number(value) : undefined)}
          defaultValue={form.watch("siteId")?.toString()}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select site" />
          </SelectTrigger>
          <SelectContent>
            {sites?.map((site) => (
              <SelectItem key={site.id} value={site.id.toString()}>
                {site.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="startDate">Start Date</Label>
        <DatePicker date={form.watch("startDate")} setDate={(d) => form.setValue("startDate", d)} />
        {form.formState.errors.startDate && <p className="text-red-500 text-sm">{form.formState.errors.startDate.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="endDate">End Date</Label>
        <DatePicker date={form.watch("endDate")} setDate={(d) => form.setValue("endDate", d)} />
        {form.formState.errors.endDate && <p className="text-red-500 text-sm">{form.formState.errors.endDate.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="requiredPersonnel">Required Personnel (optional)</Label>
        <Input
          id="requiredPersonnel"
          type="number"
          {...form.register("requiredPersonnel", { valueAsNumber: true })}
          placeholder="Enter required personnel"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="managerId">Manager (optional)</Label>
        <Select
          onValueChange={(value) => form.setValue("managerId", value ? Number(value) : undefined)}
          defaultValue={form.watch("managerId")?.toString()}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select manager" />
          </SelectTrigger>
          <SelectContent>
            {managers?.map((manager) => (
              <SelectItem key={manager.id} value={manager.id.toString()}>
                {manager.displayname}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full">
        {isEdit ? "Update" : "Create"}
      </Button>
    </form>
  );
}