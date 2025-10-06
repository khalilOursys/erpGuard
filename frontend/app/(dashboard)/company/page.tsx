"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// API functions
const getCompany = async (id: number) => {
  const token = localStorage.getItem("token");
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/companies/${id}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch company");
  }

  return response.json();
};

const updateCompany = async (id: number, companyData: FormData) => {
  const token = localStorage.getItem("token");
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/companies/${id}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: companyData,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update company");
  }

  return response.json();
};

// Types
interface User {
  id: number;
  email: string;
  companyId: number;
  company: {
    id: number;
    name: string;
  };
}

export default function EditCompanyPage() {
  const queryClient = useQueryClient();
  const router = useRouter();

  // State for client-side only values
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Alert states
  const [showAlert, setShowAlert] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");
  const [alertType, setAlertType] = useState<"default" | "destructive">(
    "default"
  );

  // Form states
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [rib, setRib] = useState("");
  const [matriculeFiscale, setMatriculeFiscale] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize client-side values
  useEffect(() => {
    setIsClient(true);

    const getUserFromStorage = (): User | null => {
      const userStr = localStorage.getItem("user");
      if (!userStr) return null;
      try {
        return JSON.parse(userStr);
      } catch (error) {
        console.error("Error parsing user from localStorage:", error);
        return null;
      }
    };

    const user = getUserFromStorage();
    setCurrentUser(user);
    setCompanyId(user?.companyId || null);
  }, []);

  // Fetch company data only when companyId is available
  const {
    data: company,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["company", companyId],
    queryFn: () => getCompany(companyId!),
    enabled: !!companyId && isClient,
  });

  // Populate form when company data is loaded
  useEffect(() => {
    if (company) {
      setName(company.name || "");
      setAddress(company.address || "");
      setBaseCurrency(company.baseCurrency || "USD");
      setRib(company.rib || "");
      setMatriculeFiscale(company.matriculeFiscale || "");
      setEmail(company.email || "");
      setPhone(company.phone || "");
    }
  }, [company]);

  const showAlertMessage = (
    msg: string,
    type: "default" | "destructive" = "default"
  ) => {
    setAlertMsg(msg);
    setAlertType(type);
    setShowAlert(true);
    setTimeout(() => {
      setShowAlert(false);
    }, 5000);
  };

  const updateCompanyMutation = useMutation({
    mutationFn: (formData: FormData) => {
      if (!companyId) throw new Error("Company ID is missing");
      return updateCompany(companyId, formData);
    },
    onSuccess: (updatedCompany) => {
      queryClient.invalidateQueries({ queryKey: ["company", companyId] });

      // Update user in localStorage if company name changed
      if (currentUser && updatedCompany.name) {
        const updatedUser = {
          ...currentUser,
          company: {
            ...currentUser.company,
            name: updatedCompany.name,
          },
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
      }

      showAlertMessage("✅ Company updated successfully", "default");
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

    if (!companyId) {
      showAlertMessage("❌ Company ID not found in user data", "destructive");
      return;
    }

    setIsSubmitting(true);

    // Validation
    if (!name) {
      showAlertMessage("❌ Company name is required", "destructive");
      setIsSubmitting(false);
      return;
    }

    if (baseCurrency && !/^[A-Z]{3}$/.test(baseCurrency)) {
      showAlertMessage(
        "❌ Base currency must be a 3-letter ISO code",
        "destructive"
      );
      setIsSubmitting(false);
      return;
    }

    // Create FormData object
    const formData = new FormData();
    formData.append("name", name);
    formData.append("address", address);
    formData.append("baseCurrency", baseCurrency);
    formData.append("rib", rib);
    formData.append("matriculeFiscale", matriculeFiscale);
    formData.append("email", email);
    formData.append("phone", phone);
    if (logo) {
      formData.append("file", logo);
    }

    updateCompanyMutation.mutate(formData);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogo(e.target.files[0]);
    }
  };

  const goBack = () => {
    router.back();
  };

  // Show loading while initializing client-side
  if (!isClient) {
    return (
      <div className="wrapper">
        <div className="main-panel">
          <div className="content">
            <div className="w-full px-4 flex justify-center items-center h-64">
              <div className="text-center">
                <i className="fas fa-spinner fa-spin text-2xl mb-2"></i>
                <p>Initializing...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="wrapper">
        <div className="main-panel">
          <div className="content">
            <div className="w-full px-4">
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Company ID not found in user data. Please make sure you are
                  logged in and belong to a company.
                </AlertDescription>
              </Alert>
              <Button onClick={goBack} variant="secondary" className="mt-4">
                <i className="fas fa-arrow-left mr-2"></i> Go Back
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="wrapper">
        <div className="main-panel">
          <div className="content">
            <div className="w-full px-4 flex justify-center items-center h-64">
              <div className="text-center">
                <i className="fas fa-spinner fa-spin text-2xl mb-2"></i>
                <p>Loading company data...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wrapper">
        <div className="main-panel">
          <div className="content">
            <div className="w-full px-4">
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Failed to load company data: {(error as Error).message}
                </AlertDescription>
              </Alert>
              <Button onClick={goBack} variant="secondary" className="mt-4">
                <i className="fas fa-arrow-left mr-2"></i> Go Back
              </Button>
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
                <div className="mb-4 flex justify-between items-center">
                  <Button onClick={goBack} variant="secondary">
                    <i className="fas fa-arrow-left mr-2"></i> Back
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Editing company for: <strong>{currentUser?.email}</strong>
                  </div>
                </div>

                <form onSubmit={submitForm}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-2xl font-bold">
                        Edit Company Settings
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-2">
                        Company ID: {companyId}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name" className="required">
                            Company Name*
                          </Label>
                          <Input
                            id="name"
                            value={name}
                            placeholder="Enter company name"
                            onChange={(e) => setName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="baseCurrency">Base Currency</Label>
                          <Input
                            id="baseCurrency"
                            value={baseCurrency}
                            placeholder="USD"
                            onChange={(e) =>
                              setBaseCurrency(e.target.value.toUpperCase())
                            }
                            maxLength={3}
                          />
                          <p className="text-xs text-muted-foreground">
                            3-letter ISO code (e.g., USD, EUR, GBP)
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Textarea
                          id="address"
                          value={address}
                          placeholder="Enter company address"
                          onChange={(e) => setAddress(e.target.value)}
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="rib">RIB (Bank Account)</Label>
                          <Input
                            id="rib"
                            value={rib}
                            placeholder="Bank account details"
                            onChange={(e) => setRib(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="matriculeFiscale">
                            Matricule Fiscale
                          </Label>
                          <Input
                            id="matriculeFiscale"
                            value={matriculeFiscale}
                            placeholder="Tax identification number"
                            onChange={(e) =>
                              setMatriculeFiscale(e.target.value)
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={email}
                            placeholder="company@example.com"
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            value={phone}
                            placeholder="+1 234 567 890"
                            onChange={(e) => setPhone(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="logo">Company Logo</Label>
                        <Input
                          id="logo"
                          type="file"
                          onChange={handleLogoChange}
                          accept=".jpg,.jpeg,.png,.gif,.svg,.webp"
                        />
                        <p className="text-xs text-muted-foreground">
                          Recommended: Square image, max 2MB
                        </p>
                        {logo && (
                          <p className="text-sm text-green-600">
                            <i className="fas fa-check-circle mr-1"></i>
                            Selected: {logo.name}
                          </p>
                        )}
                      </div>

                      <div className="flex justify-end pt-4">
                        <Button
                          type="submit"
                          variant="default"
                          disabled={isSubmitting}
                          className="min-w-32"
                        >
                          {isSubmitting ? (
                            <>
                              <i className="fas fa-spinner fa-spin mr-2"></i>
                              Updating...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-save mr-2"></i>
                              Update Company
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
        </div>
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
    </div>
  );
}
