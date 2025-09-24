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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { Textarea } from "./ui/textarea";

const serviceSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  defaultBasePay: z.number().optional(),
  defaultExtraPay: z.number().optional(),
  defaultClientPrice: z.number().optional(),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

interface ServiceFormProps {
  service?: any;
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
      defaultBasePay: service?.defaultBasePay || undefined,
      defaultExtraPay: service?.defaultExtraPay || undefined,
      defaultClientPrice: service?.defaultClientPrice || undefined,
    },
  });

  const onSubmit = async (data: ServiceFormValues) => {
    setLoading(true);
    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      const companyId = storedUser.companyId || 0;

      const serviceData = {
        ...data,
        companyId,
      };

      if (service) {
        await api.put(`/services/${service.id}`, serviceData);
        toast.success("Service updated successfully");
      } else {
        await api.post("/services", serviceData);
        toast.success("Service created successfully");
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving service:", error);
      toast.error("Failed to save service");
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
              <FormLabel>Code</FormLabel>
              <FormControl>
                <Input placeholder="Service code" {...field} />
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
                <Input placeholder="Service name" {...field} />
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
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Service description" {...field} />
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
              <FormLabel>Client Price</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={loading}>
          {loading
            ? "Saving..."
            : service
            ? "Update Service"
            : "Create Service"}
        </Button>
      </form>
    </Form>
  );
}
