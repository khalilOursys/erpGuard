// components/UserForm.tsx
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/api";
import { Eye, EyeOff } from "lucide-react";

// UserRole enum
enum UserRole {
  ADMIN = "ADMIN",
  COMMERCIAL = "COMMERCIAL",
  MANAGER = "MANAGER",
  ACCOUNTANT = "ACCOUNTANT",
}

// Form schema for create/update user
const userSchema = z.object({
  identifier: z.string().min(1, "Identifier is required"),
  displayname: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  role: z.enum(["ADMIN", "COMMERCIAL", "MANAGER", "ACCOUNTANT"]),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  companyId: z.number().optional(), // Optional for edits, required for create
});

type UserFormProps = {
  user?: any; // Partial user data for edit
  onSuccess: () => void;
};

export default function UserForm({ user, onSuccess }: UserFormProps) {
  const isEdit = !!user;
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      identifier: user?.identifier || "",
      displayname: user?.displayname || "",
      email: user?.email || "",
      role: user?.role || "COMMERCIAL",
      password: "",
      companyId: user?.companyId, // Set for edit if present
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        identifier: user.identifier,
        displayname: user.displayname || "",
        email: user.email || "",
        role: user.role,
        password: "",
        companyId: user.companyId, // Set for edit
      });
    } else {
      // Reset companyId to null for new user (will be set from storedUser)
      form.reset({
        identifier: "",
        displayname: "",
        email: "",
        role: "COMMERCIAL",
        password: "",
        companyId: undefined,
      });
    }
  }, [user, form]);

  const onSubmit = async (data: z.infer<typeof userSchema>) => {
    try {
      const payload = { ...data };
      if (isEdit) {
        await api.put(`/users/${user.id}`, payload);
        toast.success("User updated");
      } else {
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        if (!storedUser.companyId) throw new Error("Company ID not found in stored user");
        payload.companyId = storedUser.companyId; // Add companyId for new user
        await api.post("/users", payload);
        toast.success("User created");
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
        <Label htmlFor="identifier">Identifier</Label>
        <Input
          id="identifier"
          {...form.register("identifier")}
          placeholder="Enter identifier"
        />
        {form.formState.errors.identifier && <p className="text-red-500 text-sm">{form.formState.errors.identifier.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="displayname">Display Name</Label>
        <Input
          id="displayname"
          {...form.register("displayname")}
          placeholder="Enter display name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          {...form.register("email")}
          placeholder="Enter email"
        />
        {form.formState.errors.email && <p className="text-red-500 text-sm">{form.formState.errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select
          onValueChange={(value) => form.setValue("role", value as UserRole)}
          defaultValue={form.watch("role")}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="COMMERCIAL">Commercial</SelectItem>
            <SelectItem value="MANAGER">Manager</SelectItem>
            <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password {isEdit ? "(optional)" : ""}</Label>

        {/* password input + toggle */}
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            {...form.register("password")}
            placeholder="Enter password"
            className="pr-10" // space for the icon
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-pressed={showPassword}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center p-1 rounded hover:bg-slate-700/40"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {form.formState.errors.password && <p className="text-red-500 text-sm">{form.formState.errors.password.message}</p>}
      </div>

      <Button type="submit" className="w-full">
        {isEdit ? "Update" : "Create"}
      </Button>
    </form>
  );
}
