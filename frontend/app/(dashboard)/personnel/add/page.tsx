"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export interface Service {
  id: number;
  code: string;
  name: string;
  description?: string;
  companyId: number;
  createdAt: string;
  updatedAt: string;
}

// API functions - updated to accept token as parameter
const fetchServices = async (
  companyId: number,
  token: string | null
): Promise<Service[]> => {
  if (!token) {
    throw new Error("No authentication token found");
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/services/findAllServices?companyId=${companyId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );
  if (!response.ok) {
    throw new Error("Failed to fetch services");
  }
  return response.json();
};

const addPersonnel = async (
  personnelData: {
    companyId: number;
    firstName: string;
    lastName: string;
    identifier?: string;
    email: string;
    phone?: string;
    hireDate?: string;
    baseSalary: number;
    serviceId?: number;
  },
  token: string | null
) => {
  if (!token) {
    throw new Error("No authentication token found");
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/personnels`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(personnelData),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create personnel");
  }

  return response.json();
};

export default function AddPersonnelPage() {
  const queryClient = useQueryClient();
  const router = useRouter();

  // State for user data and tokens
  const [storedUser, setStoredUser] = useState<any>(null);
  const [companyId, setCompanyId] = useState<number>(0);
  const [token, setToken] = useState<string | null>(null);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [baseSalary, setBaseSalary] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Alert states
  const [showAlert, setShowAlert] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");
  const [alertType, setAlertType] = useState<"default" | "destructive">(
    "default"
  );

  // Get user data from localStorage on client side only
  useEffect(() => {
    const userData = localStorage.getItem("user");
    const authToken = localStorage.getItem("token");

    if (userData) {
      const user = JSON.parse(userData);
      setStoredUser(user);
      setCompanyId(user.companyId || 0);
    }

    if (authToken) {
      setToken(authToken);
    }
  }, []);

  // Fetch services - only when token and companyId are available
  const {
    data: services = [],
    isLoading: isLoadingServices,
    error: servicesError,
  } = useQuery({
    queryKey: ["services", companyId],
    queryFn: () => fetchServices(companyId, token),
    enabled: !!token && companyId > 0, // Only fetch when we have token and companyId
  });

  const showAlertMessage = (
    msg: string,
    type: "default" | "destructive" = "default"
  ) => {
    setAlertMsg(msg);
    setAlertType(type);
    setShowAlert(true);

    // Auto-hide alert after 3 seconds
    setTimeout(() => {
      setShowAlert(false);
    }, 3000);
  };

  const addPersonnelMutation = useMutation({
    mutationFn: (personnelData: Parameters<typeof addPersonnel>[0]) =>
      addPersonnel(personnelData, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personnel"] });
      showAlertMessage("✅ Personnel created successfully", "default");
      setTimeout(() => {
        router.push("/personnel");
      }, 1500);
    },
    onError: (error: Error) => {
      showAlertMessage(
        `❌ ${error.message || "An error occurred"}`,
        "destructive"
      );
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!token) {
      showAlertMessage("❌ Authentication token not found", "destructive");
      return;
    }

    setIsSubmitting(true);

    if (!firstName || !lastName || !email) {
      showAlertMessage(
        "❌ First name, last name, and email are required",
        "destructive"
      );
      setIsSubmitting(false);
      return;
    }

    const personnelData = {
      companyId,
      firstName,
      lastName,
      identifier: identifier || undefined,
      email,
      phone: phone || undefined,
      hireDate: hireDate || undefined,
      baseSalary: parseFloat(baseSalary) || 0,
      serviceId: selectedServiceId ? parseInt(selectedServiceId) : undefined,
    };

    addPersonnelMutation.mutate(personnelData);
  };

  const personnelList = () => {
    router.push("/personnel");
  };

  // Show loading state while getting auth data
  if (!token || companyId === 0) {
    return (
      <div className="wrapper">
        <div className="main-panel">
          <div className="content">
            <div className="w-full px-4">
              <div className="flex justify-center items-center h-64">
                <div className="text-center">
                  <i className="fas fa-spinner fa-spin text-2xl mb-2"></i>
                  <p>Loading...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wrapper">
      <div className="main-panel">
        <div className="content">
          <div className="w-full px-4">
            <div className="section-image">
              <div className="w-full">
                <div className="mb-4">
                  <Button onClick={personnelList} variant="secondary">
                    <i className="fas fa-list mr-2"></i> Back to list
                  </Button>
                </div>

                <form onSubmit={submitForm}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-2xl font-bold">
                        Add New Personnel
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName" className="required">
                            First Name*
                          </Label>
                          <Input
                            id="firstName"
                            value={firstName}
                            placeholder="First name"
                            onChange={(e) => setFirstName(e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="lastName" className="required">
                            Last Name*
                          </Label>
                          <Input
                            id="lastName"
                            value={lastName}
                            placeholder="Last name"
                            onChange={(e) => setLastName(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="identifier">Identifier</Label>
                          <Input
                            id="identifier"
                            value={identifier}
                            placeholder="Identifier"
                            onChange={(e) => setIdentifier(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email" className="required">
                            Email*
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            value={email}
                            placeholder="Email address"
                            onChange={(e) => setEmail(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            value={phone}
                            placeholder="Phone number"
                            onChange={(e) => setPhone(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="hireDate">Hire Date</Label>
                          <Input
                            id="hireDate"
                            type="date"
                            value={hireDate}
                            onChange={(e) => setHireDate(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="baseSalary" className="required">
                            Base Salary*
                          </Label>
                          <Input
                            id="baseSalary"
                            type="number"
                            step="0.01"
                            value={baseSalary}
                            placeholder="0.00"
                            onChange={(e) => setBaseSalary(e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="service">Service</Label>
                          <Select
                            value={selectedServiceId}
                            onValueChange={setSelectedServiceId}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a service" />
                            </SelectTrigger>
                            <SelectContent>
                              {isLoadingServices ? (
                                <SelectItem value="loading" disabled>
                                  Loading services...
                                </SelectItem>
                              ) : servicesError ? (
                                <SelectItem value="error" disabled>
                                  Error loading services
                                </SelectItem>
                              ) : services.length === 0 ? (
                                <SelectItem value="no-services" disabled>
                                  No services available
                                </SelectItem>
                              ) : (
                                services.map((service) => (
                                  <SelectItem
                                    key={service.id}
                                    value={service.id.toString()}
                                  >
                                    {service.name} ({service.code})
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex justify-end pt-4">
                        <Button
                          type="submit"
                          variant="default"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <i className="fas fa-spinner fa-spin mr-2"></i>
                              Creating...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-save mr-2"></i>
                              Create Personnel
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </form>
              </div>
            </div>
          </div>
          {/* Alert UI */}
          {showAlert && (
            <div className="fixed top-4 right-4 w-80 z-50">
              <Alert
                className={cn(
                  "text-white",
                  alertType === "destructive"
                    ? "bg-destructive"
                    : "bg-green-600"
                )}
              >
                <AlertTitle className="font-bold text-sm">
                  {alertType === "destructive" ? "Error" : "Success"}
                </AlertTitle>
                <AlertDescription>{alertMsg}</AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
