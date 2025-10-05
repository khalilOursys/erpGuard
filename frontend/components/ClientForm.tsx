// src/components/ClientForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

// Enums from Prisma schema
enum ClientType {
  FACTORY = "FACTORY",
  BANK = "BANK",
  INDIVIDUAL = "INDIVIDUAL",
  OTHER = "OTHER",
}

enum ContactType {
  EMAIL = "EMAIL",
  PHONE = "PHONE",
  OTHER = "OTHER",
}

// Types for API responses
type Country = { iso2: string; name: string };
type State = { isoCode: string; name: string };

// Zod schema for validation
const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.nativeEnum(ClientType),
  address: z.string().optional(),
  tax_number: z.string().optional(),
  rib: z.string().optional(),
  contacts: z.array(z.object({
    type: z.nativeEnum(ContactType),
    value: z.string().min(1, "Contact value is required"),
  })).optional(),
  sites: z.array(z.object({
    name: z.string().optional(),
    road: z.string().optional(),
    postalCode: z.string().optional(),
    address: z.string().min(1, "Site address is required"),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    countryCode: z.string().optional(),
    stateCode: z.string().optional(),
  })).optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

type ClientFormProps = {
  client?: any; // Partial Client from backend
  onSuccess: () => void;
  onCancel: () => void;
};

export default function ClientForm({ client, onSuccess, onCancel }: ClientFormProps) {
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [sortedCountries, setSortedCountries] = useState<Country[]>([]);
  const [statesPerSite, setStatesPerSite] = useState<State[][]>([]);

  const { register, control, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      type: ClientType.OTHER,
      address: "",
      tax_number: "",
      rib: "",
      contacts: [],
      sites: [],
    },
  });

  const { fields: contactFields, append: appendContact, remove: removeContact } = useFieldArray({
    control,
    name: "contacts",
  });

  const { fields: siteFields, append: appendSite, remove: removeSite } = useFieldArray({
    control,
    name: "sites",
  });

  useEffect(() => {
    fetchCountries();
  }, []);

  useEffect(() => {
    if (countries.length > 0) {
      const sorted = [...countries].sort((a, b) => {
        if (a.iso2 === 'MR') return -1;
        if (b.iso2 === 'MR') return 1;
        return a.name.localeCompare(b.name);
      });
      setSortedCountries(sorted);
    }
  }, [countries]);

  useEffect(() => {
    if (client) {
      const sitesData = client.sites?.map((s: any) => ({
        ...s,
        countryCode: s.countryCode || "",
        stateCode: s.stateCode || "",
      })) || [];
      reset({
        name: client.name || "",
        type: client.type || ClientType.OTHER,
        address: client.address || "",
        tax_number: client.tax_number || "",
        rib: client.rib || "",
        contacts: client.contacts || [],
        sites: sitesData,
      });

      // Initialize states per site
      setStatesPerSite(Array(sitesData.length).fill([]));

      // Pre-fetch states for existing sites
      sitesData.forEach((site: any, index: number) => {
        if (site.countryCode) {
          fetchStates(site.countryCode, index);
        }
      });
    }
  }, [client, reset]);

  const fetchCountries = async () => {
    try {
      const data = await api.get("/locations/countries");
      setCountries(data || []);
    } catch (err) {
      toast.error("Failed to fetch countries");
    }
  };

  const fetchStates = async (iso2: string, siteIndex: number) => {
    if (!iso2) return;
    try {
      const data = await api.get(`/locations/states/${iso2}`);
      setStatesPerSite(prev => {
        const newStates = [...prev];
        newStates[siteIndex] = data || [];
        return newStates;
      });
    } catch (err) {
      toast.error("Failed to fetch states");
    }
  };

  const onSubmit = async (data: ClientFormData) => {
    setLoading(true);
    try {
      if (client) {
        await api.put(`/clients/${client.id}`, data);
      } else {
        await api.post("/clients", data);
      }
      onSuccess();
    } catch (err) {
      toast.error("Failed to save client");
    } finally {
      setLoading(false);
    }
  };

  const sitesWatch = watch("sites") || [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Type</Label>
        <Select value={watch("type")} onValueChange={(v) => setValue("type", v as ClientType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="FACTORY">Factory</SelectItem>
            <SelectItem value="BANK">Bank</SelectItem>
            <SelectItem value="INDIVIDUAL">Individual</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input id="address" {...register("address")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tax_number">Tax Number</Label>
        <Input id="tax_number" {...register("tax_number")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rib">RIB</Label>
        <Input id="rib" {...register("rib")} />
      </div>

      <div className="space-y-4">
        <Label>Contacts</Label>
        {contactFields.map((field, index) => (
          <div key={field.id} className="flex space-x-2">
            <Select
              value={watch(`contacts.${index}.type`)}
              onValueChange={(v) => setValue(`contacts.${index}.type`, v as ContactType)}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EMAIL">Email</SelectItem>
                <SelectItem value="PHONE">Phone</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Value" {...register(`contacts.${index}.value` as const)} />
            <Button type="button" variant="destructive" size="icon" onClick={() => removeContact(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={() => appendContact({ type: ContactType.EMAIL, value: "" })}>
          <Plus className="h-4 w-4 mr-2" /> Add Contact
        </Button>
      </div>

      <div className="space-y-4">
        <Label>Sites</Label>
        {siteFields.map((field, index) => (
          <div key={field.id} className="space-y-2 border p-4 rounded-md">
            <div className="space-y-2">
              <Label>Country</Label>
              <Select
                value={watch(`sites.${index}.countryCode`)}
                onValueChange={(v) => {
                  setValue(`sites.${index}.countryCode`, v);
                  setValue(`sites.${index}.stateCode`, undefined);
                  fetchStates(v, index);
                }}
              >
                <SelectTrigger className={cn(
                  "w-full",
                  !sitesWatch[index]?.countryCode && "text-muted-foreground"
                )}>
                  <SelectValue placeholder="Select Country" />
                </SelectTrigger>
                <SelectContent>
                  {sortedCountries.map((c) => (
                    <SelectItem key={c.iso2} value={c.iso2}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {statesPerSite[index]?.length > 0 && (
              <div className="space-y-2">
                <Label>State</Label>
                <Select
                  value={watch(`sites.${index}.stateCode`)}
                  onValueChange={(v) => setValue(`sites.${index}.stateCode`, v)}
                >
                  <SelectTrigger className={cn(
                    "w-full",
                    !sitesWatch[index]?.stateCode && "text-muted-foreground"
                  )}>
                    <SelectValue placeholder="Select State" />
                  </SelectTrigger>
                  <SelectContent>
                    {statesPerSite[index].map((s) => (
                      <SelectItem key={s.isoCode} value={s.isoCode}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Input placeholder="Name" {...register(`sites.${index}.name` as const)} />
            <Input placeholder="Road" {...register(`sites.${index}.road` as const)} />
            <Input placeholder="Postal Code" {...register(`sites.${index}.postalCode` as const)} />
            <Textarea placeholder="Address" {...register(`sites.${index}.address` as const)} />
            <Input type="number" step="any" placeholder="Latitude" {...register(`sites.${index}.latitude` as const, { valueAsNumber: true })} />
            <Input type="number" step="any" placeholder="Longitude" {...register(`sites.${index}.longitude` as const, { valueAsNumber: true })} />
            <Button type="button" variant="destructive" size="icon" onClick={() => removeSite(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={() => {
          appendSite({ name: "", road: "", postalCode: "", address: "", latitude: undefined, longitude: undefined, countryCode: "", stateCode: "" });
          setStatesPerSite(prev => [...prev, []]);
        }}>
          <Plus className="h-4 w-4 mr-2" /> Add Site
        </Button>
      </div>

      <div className="flex space-x-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : client ? "Update Client" : "Add Client"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}