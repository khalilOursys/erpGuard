"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";

const serviceSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  defaultBasePay: z.number().optional(),
  defaultExtraPay: z.number().optional(),
  defaultClientPrice: z.number().optional(),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

interface ServiceFormProps {
  service?: ServiceFormValues & { id: number };
  onSuccess: () => void;
}

export default function ServiceForm({ service, onSuccess }: ServiceFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      code: service?.code || "",
      name: service?.name || "",
      description: service?.description || "",
      isActive: service?.isActive ?? true,
      defaultBasePay: service?.defaultBasePay,
      defaultExtraPay: service?.defaultExtraPay,
      defaultClientPrice: service?.defaultClientPrice,
    },
  });

  const onSubmit = async (data: ServiceFormValues) => {
    setLoading(true);
    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      const companyId = storedUser.companyId;

      if (!companyId) {
        throw new Error("Company ID not found. Please log in again.");
      }

      const payload = { ...data, companyId };

      if (service) {
        await api.put(`/services/${service.id}`, payload);
        toast.success("Service updated");
      } else {
        await api.post("/services", payload);
        toast.success("Service created");
      }
      onSuccess();
    } catch (err: any) {
      console.error("Error saving service:", err);
      toast.error(err.message || "Failed to save service");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Code (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., SRV-001" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Security Guarding" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Service details..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center space-x-2">
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel>Active</FormLabel>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="defaultBasePay"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default Base Pay (Optional)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="defaultExtraPay"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default Extra Pay (Optional)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="defaultClientPrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default Client Price (Optional)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : service ? "Update Service" : "Create Service"}
        </Button>
      </form>
    </Form>
  );
}