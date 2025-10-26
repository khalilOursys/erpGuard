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

// Zod schema for validation (fixed: address now optional + refine for new sites only)
const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.nativeEnum(ClientType),
  address: z.string().optional(),
  tax_number: z.string().optional(),
  rib: z.string().optional(),
  contacts: z
    .array(
      z.object({
        type: z.nativeEnum(ContactType),
        value: z.string().min(1, "Contact value is required"),
      })
    )
    .optional(),
  sites: z
    .array(
      z.object({
        id: z.number().optional(), // For existing sites
        name: z.string().optional(),
        road: z.string().optional(),
        postalCode: z.string().optional(),
        address: z.string().optional(), // Now optional to allow legacy empty addresses
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        countryCode: z.string().optional(),
        stateCode: z.string().optional(),
      }).refine(
        (site) => {
          // For new sites (no id), address is strictly required
          // For existing (has id), allow empty/null/undefined
          if (site.id) return true;
          return site.address && site.address.trim().length >= 1;
        },
        { message: "Site address is required for new sites", path: ["address"] }
      )
    )
    .optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

type ClientFormProps = {
  client?: any; // Partial Client from backend
  onSuccess: () => void;
  onCancel: () => void;
};

export default function ClientForm({
  client,
  onSuccess,
  onCancel,
}: ClientFormProps) {
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [sortedCountries, setSortedCountries] = useState<Country[]>([]);
  const [statesPerSite, setStatesPerSite] = useState<State[][]>([]);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    mode: 'onChange', // Real-time validation for better UX
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

  const {
    fields: contactFields,
    append: appendContact,
    remove: removeContact,
  } = useFieldArray({
    control,
    name: "contacts",
  });

  const {
    fields: siteFields,
    append: appendSite,
    remove: removeSite,
  } = useFieldArray({
    control,
    name: "sites",
  });

  const sitesWatch = watch("sites") || [];

  useEffect(() => {
    fetchCountries();
  }, []);

  useEffect(() => {
    if (countries.length > 0) {
      const sorted = [...countries].sort((a, b) => {
        if (a.iso2 === "MR") return -1;
        if (b.iso2 === "MR") return 1;
        return a.name.localeCompare(b.name);
      });
      setSortedCountries(sorted);
    }
  }, [countries]);

  useEffect(() => {
    if (client) {
      const sitesData = client.sites?.map((s: any) => ({
        id: s.id, // Ensure id is preserved
        name: s.name || "",
        road: s.road || "",
        postalCode: s.postalCode || "",
        address: s.address || "", // Coerce to empty string for consistency
        latitude: s.latitude,
        longitude: s.longitude,
        countryCode: s.countryCode || "",
        stateCode: s.stateCode || "",
      })) || [];
      const contactsData = client.contacts?.map((c: any) => ({
        type: c.type,
        value: c.value || "", // Coerce to empty string
      })) || [];
      reset({
        name: client.name || "",
        type: client.type || ClientType.OTHER,
        address: client.address || "",
        tax_number: client.tax_number || "",
        rib: client.rib || "",
        contacts: contactsData,
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
      setStatesPerSite((prev) => {
        const newStates = [...prev];
        newStates[siteIndex] = data || [];
        return newStates;
      });
    } catch (err) {
      toast.error("Failed to fetch states");
    }
  };

  const onSubmit = async (data: ClientFormData) => {
    console.log('Form submitting with data:', data); // Debug: Inspect payload
    setLoading(true);
    try {
      if (client) {
        console.log(`PUT /clients/${client.id}`); // Debug: Confirm endpoint
        await api.put(`/clients/${client.id}`, data);
      } else {
        console.log('POST /clients'); // Debug: Confirm endpoint
        await api.post("/clients", data);
      }
      console.log('API success'); // Debug: Confirm response
      onSuccess();
    } catch (err) {
      console.error('Submit error:', err); // Debug: Full error details
      toast.error(err instanceof Error ? err.message : "Failed to save client");
    } finally {
      setLoading(false);
    }
  };

  // Improved error flattening for global summary (handles nested paths like sites[0].address)
  const flattenErrors = (errors: any, path: string[] = []): [string, string][] => {
    const flattened: [string, string][] = [];
    Object.entries(errors).forEach(([key, value]) => {
      if (value && typeof value === 'object') {
        if ('message' in value && typeof value.message === 'string') {
          flattened.push([path.concat(key).join('.'), value.message]);
        } else {
          flattened.push(...flattenErrors(value, path.concat(key)));
        }
      }
    });
    return flattened;
  };

  const flattenedErrors = flattenErrors(errors);
  const hasErrors = flattenedErrors.length > 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Core Client Fields - Compact grid for tax/rib */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
          <Input id="name" {...register("name")} className="w-full" />
          {errors.name && (
            <p className="text-sm text-destructive" id="name-error">
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select
            value={watch("type")}
            onValueChange={(v) => setValue("type", v as ClientType)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ClientType.FACTORY}>Factory</SelectItem>
              <SelectItem value={ClientType.BANK}>Bank</SelectItem>
              <SelectItem value={ClientType.INDIVIDUAL}>Individual</SelectItem>
              <SelectItem value={ClientType.OTHER}>Other</SelectItem>
            </SelectContent>
          </Select>
          {errors.type && (
            <p className="text-sm text-destructive">{errors.type.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Textarea id="address" {...register("address")} className="w-full min-h-[80px]" />
          {errors.address && (
            <p className="text-sm text-destructive" id="address-error">
              {errors.address.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tax_number">Tax Number</Label>
            <Input id="tax_number" {...register("tax_number")} />
            {errors.tax_number && (
              <p className="text-sm text-destructive" id="tax_number-error">
                {errors.tax_number.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="rib">RIB</Label>
            <Input id="rib" {...register("rib")} />
            {errors.rib && (
              <p className="text-sm text-destructive" id="rib-error">
                {errors.rib.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Contacts Section - Compact flex layout */}
      <div className="space-y-3">
        <Label>Contacts</Label>
        {contactFields.map((field, index) => (
          <div key={field.id} className="flex items-end gap-2 p-3 border rounded-md">
            <Select
              value={watch(`contacts.${index}.type`)}
              onValueChange={(v) =>
                setValue(`contacts.${index}.type`, v as ContactType)
              }
            >
              <SelectTrigger className="w-32 flex-shrink-0">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EMAIL">Email</SelectItem>
                <SelectItem value="PHONE">Phone</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Value"
              className="flex-1"
              {...register(`contacts.${index}.value` as const)}
            />
            {errors.contacts?.[index]?.value && (
              <p className="text-xs text-destructive flex-shrink-0">
                {errors.contacts[index]?.value?.message}
              </p>
            )}
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="flex-shrink-0 h-8 w-8"
              onClick={() => removeContact(index)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        {errors.contacts && !Array.isArray(errors.contacts) && (
          <p className="text-sm text-destructive">{errors.contacts.message}</p>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          onClick={() => appendContact({ type: ContactType.EMAIL, value: "" })}
        >
          <Plus className="h-4 w-4 mr-2" /> Add Contact
        </Button>
      </div>

      {/* Sites Section - Compact with geo in one row, details in grid */}
      <div className="space-y-3">
        <Label>Sites</Label>
        {siteFields.map((field, index) => (
          <div key={field.id} className="p-4 border rounded-md space-y-3 relative">
            {/* Trash button positioned top-right for better UX */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6"
              onClick={() => removeSite(index)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>

            {/* Geo row: Country & State side-by-side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Country</Label>
                <Select
                  value={watch(`sites.${index}.countryCode`)}
                  onValueChange={(v) => {
                    setValue(`sites.${index}.countryCode`, v);
                    setValue(`sites.${index}.stateCode`, undefined);
                    fetchStates(v, index);
                  }}
                >
                  <SelectTrigger
                    className={cn(
                      "w-full text-xs",
                      !sitesWatch[index]?.countryCode && "text-muted-foreground"
                    )}
                  >
                    <SelectValue placeholder="Select Country" />
                  </SelectTrigger>
                  <SelectContent className="w-full max-h-48 overflow-y-auto">
                    {sortedCountries.map((c) => (
                      <SelectItem key={c.iso2} value={c.iso2} className="text-sm">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.sites?.[index]?.countryCode && (
                  <p className="text-xs text-destructive">
                    {errors.sites[index]?.countryCode?.message}
                  </p>
                )}
              </div>

              {statesPerSite[index]?.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs font-medium">State</Label>
                  <Select
                    value={watch(`sites.${index}.stateCode`)}
                    onValueChange={(v) => setValue(`sites.${index}.stateCode`, v)}
                  >
                    <SelectTrigger
                      className={cn(
                        "w-full text-xs",
                        !sitesWatch[index]?.stateCode && "text-muted-foreground"
                      )}
                    >
                      <SelectValue placeholder="Select State" />
                    </SelectTrigger>
                    <SelectContent className="w-full max-h-48 overflow-y-auto">
                      {statesPerSite[index].map((s) => (
                        <SelectItem key={s.isoCode} value={s.isoCode} className="text-sm">
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.sites?.[index]?.stateCode && (
                    <p className="text-xs text-destructive">
                      {errors.sites[index]?.stateCode?.message}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Site details in compact grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Name</Label>
                <Input
                  placeholder="Name"
                  className="text-sm"
                  {...register(`sites.${index}.name` as const)}
                />
                {errors.sites?.[index]?.name && (
                  <p className="text-xs text-destructive">
                    {errors.sites[index]?.name?.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Road</Label>
                <Input
                  placeholder="Road"
                  className="text-sm"
                  {...register(`sites.${index}.road` as const)}
                />
                {errors.sites?.[index]?.road && (
                  <p className="text-xs text-destructive">
                    {errors.sites[index]?.road?.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Postal Code</Label>
                <Input
                  placeholder="Postal Code"
                  className="text-sm"
                  {...register(`sites.${index}.postalCode` as const)}
                />
                {errors.sites?.[index]?.postalCode && (
                  <p className="text-xs text-destructive">
                    {errors.sites[index]?.postalCode?.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Address</Label>
              <Textarea
                placeholder="Address"
                className="w-full text-sm min-h-[60px]"
                {...register(`sites.${index}.address` as const)}
              />
              {errors.sites?.[index]?.address && (
                <p className="text-xs text-destructive">
                  {errors.sites[index]?.address?.message}
                </p>
              )}
            </div>
          </div>
        ))}
        {errors.sites && !Array.isArray(errors.sites) && (
          <p className="text-sm text-destructive">{errors.sites.message}</p>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          onClick={() => {
            appendSite({
              name: "",
              road: "",
              postalCode: "",
              address: "", // Empty for new, but validation will prompt user
              latitude: undefined,
              longitude: undefined,
              countryCode: "",
              stateCode: "",
            });
            setStatesPerSite((prev) => [...prev, []]);
          }}
        >
          <Plus className="h-4 w-4 mr-2" /> Add Site
        </Button>
      </div>

      {/* Improved Global Error Summary (flattened for nested paths) */}
      {hasErrors && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md">
          <p className="text-sm font-medium text-destructive">Please fix the errors below:</p>
          <ul className="mt-1 text-sm text-destructive/80 list-disc list-inside max-h-32 overflow-y-auto">
            {flattenedErrors.map(([path, message]) => (
              <li key={path}>{`${path}: ${message}`}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Submit Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
        <Button type="submit" disabled={loading} className="flex-1 sm:flex-none">
          {loading ? "Saving..." : client ? "Update Client" : "Add Client"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 sm:flex-none">
          Cancel
        </Button>
      </div>
    </form>
  );
}