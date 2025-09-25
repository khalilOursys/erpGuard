"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  CalendarIcon,
  FileText,
  Upload,
  ArrowLeft,
  Save,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// API functions
const fetchContract = async (id: string) => {
  const token = localStorage.getItem("token");
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/personnels/contracts/${id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!response.ok) {
    throw new Error("Failed to fetch contract");
  }
  return response.json();
};

const updateContractWithFile = async (
  contractId: number,
  contractData: FormData
) => {
  const token = localStorage.getItem("token");
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/personnels/contracts/${contractId}/with-file`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: contractData,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update contract");
  }

  return response.json();
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditContractPage({ params }: PageProps) {
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(
    null
  );
  const queryClient = useQueryClient();
  const router = useRouter();

  React.useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params;
      setResolvedParams(resolved);
    };
    resolveParams();
  }, [params]);

  const contractId = resolvedParams ? parseInt(resolvedParams.id) : null;

  // Get from token or context
  const [companyId] = useState(1);
  const [contractNumber, setContractNumber] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [personnelId, setPersonnelId] = useState<number | null>(null);

  // Alert states
  const [showAlert, setShowAlert] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");
  const [alertType, setAlertType] = useState<"default" | "destructive">(
    "default"
  );

  // Fetch contract data
  const {
    data: contract,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["contract", contractId],
    queryFn: () => fetchContract(contractId!.toString()),
    enabled: !!contractId,
  });

  // Populate form when contract data is loaded
  useEffect(() => {
    if (contract) {
      setContractNumber(contract.contractNumber || "");
      setStartDate(formatDateForInput(contract.startDate) || "");
      setEndDate(formatDateForInput(contract.endDate) || "");
      setPersonnelId(contract.personnelId);
    }
  }, [contract]);

  const formatDateForInput = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
  };

  const showAlertMessage = (
    msg: string,
    type: "default" | "destructive" = "default"
  ) => {
    setAlertMsg(msg);
    setAlertType(type);
    setShowAlert(true);

    // Auto-hide alert after 5 seconds
    setTimeout(() => {
      setShowAlert(false);
    }, 5000);
  };

  const updateContractMutation = useMutation({
    mutationFn: (formData: FormData) => {
      if (!contractId) throw new Error("Contract ID is missing");
      return updateContractWithFile(contractId, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts", personnelId] });
      queryClient.invalidateQueries({ queryKey: ["contract", contractId] });
      showAlertMessage("✅ Contract updated successfully", "default");
      setTimeout(() => {
        if (personnelId) {
          router.push(`/personnel/contract/${personnelId}`);
        }
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

    if (!contractId) {
      showAlertMessage("❌ Contract ID is missing", "destructive");
      return;
    }

    setIsSubmitting(true);

    // Validation
    if (!contractNumber) {
      showAlertMessage("❌ Contract number is required", "destructive");
      setIsSubmitting(false);
      return;
    }

    if (!startDate) {
      showAlertMessage("❌ Start date is required", "destructive");
      setIsSubmitting(false);
      return;
    }

    if (!endDate) {
      showAlertMessage("❌ End date is required", "destructive");
      setIsSubmitting(false);
      return;
    }

    // Create FormData object
    const formData = new FormData();
    formData.append("contractNumber", contractNumber);
    formData.append("startDate", new Date(startDate).toISOString());
    formData.append("endDate", new Date(endDate).toISOString());
    formData.append("companyId", companyId.toString());

    if (file) {
      formData.append("file", file);
    }

    updateContractMutation.mutate(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const goBack = () => {
    if (personnelId) {
      router.push(`/personnel/contract/${personnelId}`);
    } else {
      router.back();
    }
  };

  if (!contractId) {
    return <div>Loading contract ID...</div>;
  }

  if (isLoading) {
    return (
      <div className="wrapper">
        <div className="main-panel">
          <div className="content">
            <div className="w-full px-4">
              <div className="mb-4">
                <Button onClick={() => router.back()} variant="secondary">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
              </div>
              <Card>
                <CardHeader>
                  <Skeleton className="h-8 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="flex justify-end pt-4 gap-2">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-40" />
                  </div>
                </CardContent>
              </Card>
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
              <div className="mb-4">
                <Button onClick={() => router.back()} variant="secondary">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
              </div>
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Failed to load contract. Please try again.
                </AlertDescription>
              </Alert>
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
                  <Button onClick={goBack} variant="secondary">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Contracts
                  </Button>
                </div>

                <form onSubmit={submitForm}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-2xl font-bold flex items-center gap-2">
                        <FileText className="h-6 w-6" />
                        Update Contract
                      </CardTitle>
                      <CardDescription>
                        Edit contract details for personnel #{personnelId}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label
                            htmlFor="contractNumber"
                            className="required flex items-center"
                          >
                            Contract Number
                            <Badge variant="outline" className="ml-2">
                              Required
                            </Badge>
                          </Label>
                          <Input
                            id="contractNumber"
                            value={contractNumber}
                            placeholder="CTR-2024-001"
                            onChange={(e) => setContractNumber(e.target.value)}
                            className={cn(
                              !contractNumber && "border-destructive"
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label
                            htmlFor="startDate"
                            className="required flex items-center"
                          >
                            Start Date
                            <Badge variant="outline" className="ml-2">
                              Required
                            </Badge>
                          </Label>
                          <div className="relative">
                            <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="startDate"
                              type="date"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              className={cn(
                                "pl-10",
                                !startDate && "border-destructive"
                              )}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="endDate"
                            className="required flex items-center"
                          >
                            End Date
                            <Badge variant="outline" className="ml-2">
                              Required
                            </Badge>
                          </Label>
                          <div className="relative">
                            <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="endDate"
                              type="date"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              className={cn(
                                "pl-10",
                                !endDate && "border-destructive"
                              )}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                        <Label htmlFor="file" className="text-base">
                          Contract File
                        </Label>
                        <p className="text-sm text-muted-foreground mb-3">
                          Upload a new file to replace the current contract
                          document
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Input
                              id="file"
                              type="file"
                              onChange={handleFileChange}
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                              className="cursor-pointer"
                            />
                            {file && (
                              <p className="text-sm text-muted-foreground mt-2">
                                New file: {file.name}
                              </p>
                            )}
                          </div>

                          {contract?.fileUrl && (
                            <div className="flex flex-col">
                              <p className="text-sm font-medium mb-1">
                                Current file:
                              </p>
                              <div className="flex items-center gap-2 p-2 border rounded-md bg-background">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm truncate">
                                  {contract.fileName || "contract_file"}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="ml-auto"
                                  type="button"
                                  onClick={() =>
                                    window.open(contract.fileUrl, "_blank")
                                  }
                                >
                                  View
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end pt-4 gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={goBack}
                          disabled={isSubmitting}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={isSubmitting}
                          className="min-w-40"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Updating Contract...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Update Contract
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
          <div className="fixed top-4 right-4 w-80 z-50 animate-in slide-in-from-right">
            <Alert
              className={cn(
                "text-white shadow-lg",
                alertType === "destructive"
                  ? "bg-destructive border-destructive"
                  : "bg-green-600 border-green-700"
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
