"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import ContractForm from "@/components/ContractForm";
import { toast } from "sonner";
import api from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function EditContractPage() {
  const router = useRouter();
  const { id } = useParams();
  const [contract, setContract] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContract = async () => {
      try {
        const data = await api.get(`/contracts/${id}`);
        setContract(data);
      } catch (err) {
        toast.error("Failed to fetch contract");
        router.push("/contracts");
      } finally {
        setLoading(false);
      }
    };

    fetchContract();
  }, [id, router]);

  const handleSuccess = () => {
    toast.success("Contract updated successfully");
    router.push("/contracts");
  };

  const handleCancel = () => {
    router.push("/contracts");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!contract) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-background rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">Edit Contract</h1>
      <ContractForm
        contract={contract}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
}