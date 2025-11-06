"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
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
import api from "@/lib/api";

const personnelSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  identifier: z.string().optional(),
  identifierType: z
    .enum(["NATIONAL_ID", "PASSPORT", "RESIDENCE_PERMIT"])
    .optional(),
  baseSalary: z
    .number()
    .nonnegative("Base salary must be non-negative")
    .default(0),
  idPicture: z.any().optional(),
});

type PersonnelFormProps = {
  personnel?: any;
  onSuccess: () => void;
};

export default function PersonnelForm({
  personnel,
  onSuccess,
}: PersonnelFormProps) {
  const isEdit = !!personnel;
  const form = useForm<z.infer<typeof personnelSchema>>({
    resolver: zodResolver(personnelSchema),
    defaultValues: {
      firstName: personnel?.firstName || "",
      lastName: personnel?.lastName || "",
      email: personnel?.email || "",
      phone: personnel?.phone || "",
      identifier: personnel?.identifier || "",
      identifierType: personnel?.identifierType || undefined,
      baseSalary: personnel?.baseSalary || 0,
    },
  });

  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (personnel) {
      form.reset({
        firstName: personnel.firstName || "",
        lastName: personnel.lastName || "",
        email: personnel.email || "",
        phone: personnel.phone || "",
        identifier: personnel.identifier || "",
        identifierType: personnel.identifierType || undefined,
        baseSalary: personnel.baseSalary || 0,
      });
    }
  }, [personnel, form]);

const onSubmit = async (data: z.infer<typeof personnelSchema>) => {
  try {
    const formData = new FormData();
    formData.append('firstName', data.firstName || '');
    formData.append('lastName', data.lastName || '');
    if (data.email) formData.append('email', data.email);
    if (data.phone) formData.append('phone', data.phone);
    if (data.identifier) formData.append('identifier', data.identifier);
    if (data.identifierType) formData.append('identifierType', data.identifierType);
    formData.append('baseSalary', data.baseSalary.toString());
    if (file) formData.append('idPicture', file);

    if (isEdit) {
      await api.put(`/personnel/${personnel.id}`, formData); // Now handles FormData correctly
      toast.success("Personnel updated");
    } else {
      await api.post("/personnel", formData);
      toast.success("Personnel created");
    }
    onSuccess();
  } catch (err) {
    console.error("Operation failed:", err);
    toast.error("Operation failed");
  }
};

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="firstName">First Name</Label>
        <Input
          id="firstName"
          {...form.register("firstName")}
          placeholder="Enter first name"
        />
        {form.formState.errors.firstName && (
          <p className="text-red-500 text-sm">
            {form.formState.errors.firstName.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="lastName">Last Name</Label>
        <Input
          id="lastName"
          {...form.register("lastName")}
          placeholder="Enter last name"
        />
        {form.formState.errors.lastName && (
          <p className="text-red-500 text-sm">
            {form.formState.errors.lastName.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email (optional)</Label>
        <Input
          id="email"
          {...form.register("email")}
          placeholder="Enter email"
        />
        {form.formState.errors.email && (
          <p className="text-red-500 text-sm">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone (optional)</Label>
        <Input
          id="phone"
          {...form.register("phone")}
          placeholder="Enter phone"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="identifier">Identifier</Label>
        <Input
          id="identifier"
          {...form.register("identifier")}
          placeholder="Enter identifier"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="identifierType">
          Identifier Type (if identifier provided)
        </Label>
        <Select
          onValueChange={(value) =>
            form.setValue("identifierType", value as any)
          }
          defaultValue={form.watch("identifierType")}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NATIONAL_ID">National ID</SelectItem>
            <SelectItem value="PASSPORT">Passport</SelectItem>
            <SelectItem value="RESIDENCE_PERMIT">Residence Permit</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="baseSalary">Base Salary</Label>
        <Input
          id="baseSalary"
          type="number"
          step="0.01"
          {...form.register("baseSalary", { valueAsNumber: true })}
          placeholder="Enter base salary"
        />
        {form.formState.errors.baseSalary && (
          <p className="text-red-500 text-sm">
            {form.formState.errors.baseSalary.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="idPicture">
          ID Picture {isEdit ? "(replace optional)" : "(optional)"}
        </Label>
        <Input
          id="idPicture"
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </div>
      <Button type="submit" className="w-full">
        {isEdit ? "Update" : "Create"}
      </Button>
    </form>
  );
}
