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

export interface Personnel {
  id: string;
  companyId: number;
  firstName: string;
  lastName: string;
  identifier?: string;
  email: string;
  phone?: string;
  hireDate?: string;
  baseSalary: number;
  serviceId?: number;
  createdAt: string;
  updatedAt: string;
}

// API function to fetch personnel data
const fetchPersonnel = async (id: string): Promise<Personnel> => {
  const token = localStorage.getItem("token");
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/personnels/${id}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );
  if (!response.ok) {
    throw new Error("Failed to fetch personnel");
  }
  return response.json();
};

// API functions
const fetchServices = async (companyId: number): Promise<Service[]> => {
  const token = localStorage.getItem("token");
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

// API function to update personnel data
const updatePersonnel = async (personnelData: Personnel) => {
  const token = localStorage.getItem("token");
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/personnels/${personnelData.id}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(personnelData),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update personnel");
  }

  return response.json();
};

interface PageProps {
  params: { id: string };
}

export default function UpdatePersonnelPage({ params }: PageProps) {
  // Correctly access the id from params
  const { id } = params;
  const queryClient = useQueryClient();
  const router = useRouter();

  const [companyId] = useState(1); // Get from token or context
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [baseSalary, setBaseSalary] = useState("");
  const [serviceId, setServiceId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Alert states
  const [showAlert, setShowAlert] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");
  const [alertType, setAlertType] = useState<"default" | "destructive">(
    "default"
  );

  // Fetch personnel data
  const {
    data: personnelData,
    isLoading: isLoadingPersonnel,
    error: personnelError,
  } = useQuery({
    queryKey: ["personnel", id],
    queryFn: () => fetchPersonnel(id),
    enabled: !!id,
  });

  // Fetch services data
  const {
    data: servicesData,
    isLoading: isLoadingServices,
    error: servicesError,
  } = useQuery({
    queryKey: ["services", companyId],
    queryFn: () => fetchServices(companyId),
  });

  // Populate form with existing data when personnelData is available
  useEffect(() => {
    if (personnelData) {
      setFirstName(personnelData.firstName);
      setLastName(personnelData.lastName);
      setIdentifier(personnelData.identifier || "");
      setEmail(personnelData.email);
      setPhone(personnelData.phone || "");
      setHireDate(
        personnelData.hireDate
          ? new Date(personnelData.hireDate).toISOString().split("T")[0]
          : ""
      );
      setBaseSalary(personnelData.baseSalary.toString());
      setServiceId(personnelData.serviceId?.toString() || "");
    }
  }, [personnelData]);

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

  const updatePersonnelMutation = useMutation({
    mutationFn: updatePersonnel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personnel"] });
      showAlertMessage("✅ Personnel updated successfully", "default");
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
    setIsSubmitting(true);

    if (!firstName || !lastName || !email) {
      showAlertMessage(
        "❌ First name, last name, and email are required",
        "destructive"
      );
      setIsSubmitting(false);
      return;
    }

    const updatedData = {
      id: id,
      companyId: personnelData?.companyId || 1,
      firstName,
      lastName,
      identifier: identifier || undefined,
      email,
      phone: phone || undefined,
      hireDate: hireDate || undefined,
      baseSalary: parseFloat(baseSalary) || 0,
      serviceId: serviceId ? parseInt(serviceId) : undefined,
      createdAt: personnelData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    updatePersonnelMutation.mutate(updatedData);
  };

  const backToList = () => {
    router.push("/personnel");
  };

  const isLoading = isLoadingPersonnel || isLoadingServices;
  const error = personnelError || servicesError;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center text-red-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 mx-auto"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="mt-2 font-medium">Error loading data</p>
          <p className="text-sm mt-1 text-gray-600">{error.message}</p>
          <Button onClick={backToList} variant="secondary" className="mt-4">
            Back to list
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button onClick={backToList} variant="ghost" className="mr-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
          Back to List
        </Button>
        <h1 className="text-3xl font-bold">Edit Personnel</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personnel Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitForm} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter first name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter last name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="identifier">Employee ID</Label>
                <Input
                  id="identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter employee ID"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number"
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

              <div className="space-y-2">
                <Label htmlFor="baseSalary">Base Salary *</Label>
                <Input
                  id="baseSalary"
                  type="number"
                  step="0.01"
                  value={baseSalary}
                  onChange={(e) => setBaseSalary(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serviceId">Service</Label>
                <Select
                  value={serviceId}
                  onValueChange={(value) => {
                    if (value !== "") setServiceId(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {servicesData?.map((service) => (
                      <SelectItem
                        key={service.id}
                        value={service.id.toString()}
                      >
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <Button type="button" variant="outline" onClick={backToList}>
                Cancel
              </Button>
              <Button type="submit" variant="default" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Updating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save mr-2"></i>
                    Update Personnel
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Alert UI */}
      {showAlert && (
        <div className="fixed top-4 right-4 w-80 z-50">
          <Alert
            className={cn(
              "text-white",
              alertType === "destructive" ? "bg-destructive" : "bg-green-600"
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
  );
}
