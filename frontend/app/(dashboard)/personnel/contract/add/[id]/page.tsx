"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// API function for contract upload
const createContractWithFile = async (
  personnelId: number,
  contractData: FormData
) => {
  const token = localStorage.getItem("token");
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/personnels/${personnelId}/contracts/with-file`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: contractData,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create contract");
  }

  return response.json();
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AddContractPage({ params }: PageProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(
    null
  );

  React.useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params;
      setResolvedParams(resolved);
    };
    resolveParams();
  }, [params]);

  const personnelId = resolvedParams ? parseInt(resolvedParams.id) : null;

  // Alert states
  const [showAlert, setShowAlert] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");
  const [alertType, setAlertType] = useState<"default" | "destructive">(
    "default"
  );

  // Get from token or context
  const [companyId] = useState(1);
  const [contractNumber, setContractNumber] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const createContractMutation = useMutation({
    mutationFn: (formData: FormData) => {
      if (!personnelId) throw new Error("Personnel ID is missing");
      return createContractWithFile(personnelId, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts", personnelId] });
      showAlertMessage("✅ Contract created successfully", "default");
      setTimeout(() => {
        router.push(`/personnel/contract/${personnelId}`);
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

    if (!personnelId) {
      showAlertMessage("❌ Personnel ID is missing", "destructive");
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

    if (!file) {
      showAlertMessage("❌ File is required", "destructive");
      setIsSubmitting(false);
      return;
    }

    // Create FormData object
    const formData = new FormData();
    formData.append("contractNumber", contractNumber);
    formData.append("personnelId", personnelId.toString());
    formData.append("startDate", new Date(startDate).toISOString());
    formData.append("endDate", new Date(endDate).toISOString());
    formData.append("companyId", companyId.toString());
    formData.append("file", file);

    createContractMutation.mutate(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const goBack = () => {
    if (personnelId) {
      router.push(`/personnel/contract/${personnelId}`);
    }
  };

  if (!personnelId) {
    return <div>Loading...</div>;
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
                    <i className="fas fa-arrow-left mr-2"></i> Back to Personnel
                  </Button>
                </div>

                <form onSubmit={submitForm}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-2xl font-bold">
                        Add New Contract for Personnel #{personnelId}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="contractNumber" className="required">
                            Contract Number*
                          </Label>
                          <Input
                            id="contractNumber"
                            value={contractNumber}
                            placeholder="CTR-2024-001"
                            onChange={(e) => setContractNumber(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="startDate" className="required">
                            Start Date*
                          </Label>
                          <Input
                            id="startDate"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="endDate" className="required">
                            End Date*
                          </Label>
                          <Input
                            id="endDate"
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="file" className="required">
                          Contract File*
                        </Label>
                        <Input
                          id="file"
                          type="file"
                          onChange={handleFileChange}
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          required
                        />
                        {file && (
                          <p className="text-sm text-muted-foreground">
                            Selected: {file.name}
                          </p>
                        )}
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
                              Uploading...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-upload mr-2"></i>
                              Upload Contract
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
