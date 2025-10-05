"use client";

import { useRouter } from "next/navigation";
import ContractForm from "@/components/ContractForm";
import { toast } from "sonner";

export default function AddContractPage() {
  const router = useRouter();

  const handleSuccess = () => {
    toast.success("Contract added successfully");
    router.push("/contracts");
  };

  const handleCancel = () => {
    router.push("/contracts");
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-background rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">Add Contract</h1>
      <ContractForm onSuccess={handleSuccess} onCancel={handleCancel} />
    </div>
  );
}